#define _GNU_SOURCE

#include <errno.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/socket.h>
#include <sys/syscall.h>
#include <unistd.h>

#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/seccomp.h>

#if !defined(__linux__)
#error "The deterministic network boundary requires Linux seccomp."
#endif

#if defined(__aarch64__)
#define DND_AUDIT_ARCH AUDIT_ARCH_AARCH64
#elif defined(__x86_64__)
#define DND_AUDIT_ARCH AUDIT_ARCH_X86_64
#else
#error "The deterministic network boundary has no audited seccomp architecture."
#endif

#ifndef SYS_io_uring_enter
#error "The deterministic network boundary requires io_uring syscall definitions."
#endif

#ifndef SYS_io_uring_register
#error "The deterministic network boundary requires io_uring syscall definitions."
#endif

#ifndef SYS_io_uring_setup
#error "The deterministic network boundary requires io_uring syscall definitions."
#endif

static const unsigned int dnd_errno = SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA);

/*
 * The architecture check is deliberately a kill action: a filter written for
 * one syscall ABI must never silently run against another ABI.  Socket and
 * socketpair inspect only their domain argument, so AF_UNIX remains usable;
 * io_uring is denied as a whole because its submission queue can create a
 * socket without another socket syscall that this filter could inspect.
 */
static int install_network_filter(void) {
  const struct sock_filter filter[] = {
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch)),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, DND_AUDIT_ARCH, 1, 0),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_socket, 0, 5),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[0])),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AF_INET, 2, 0),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AF_INET6, 1, 0),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_socketpair, 0, 5),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[0])),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AF_INET, 2, 0),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AF_INET6, 1, 0),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_io_uring_setup, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_io_uring_enter, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_io_uring_register, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
  };
  const struct sock_fprog program = {
      .len = (unsigned short)(sizeof(filter) / sizeof(filter[0])),
      .filter = (struct sock_filter *)filter,
  };

  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
    fprintf(stderr,
            "Raw Swarm deterministic network boundary could not enable "
            "no-new-privileges: %s\n",
            strerror(errno));
    return 1;
  }
  if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &program) != 0) {
    fprintf(stderr,
            "Raw Swarm deterministic network boundary could not install "
            "the Linux seccomp filter: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr,
            "Usage: deterministic-network-boundary COMMAND [ARGUMENT ...]\n");
    return 64;
  }
  if (install_network_filter() != 0) {
    return 78;
  }
  execvp(argv[1], &argv[1]);
  fprintf(stderr,
          "Raw Swarm deterministic network boundary could not execute %s: %s\n",
          argv[1], strerror(errno));
  return 127;
}
