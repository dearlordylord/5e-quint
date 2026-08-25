#define _GNU_SOURCE

#include <errno.h>
#include <limits.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/socket.h>
#include <sys/stat.h>
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

#if defined(__x86_64__)
#define DND_X32_SYSCALL_BIT 0x40000000U
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

#ifndef SYS_close_range
#error "The deterministic network boundary requires close_range syscall definitions."
#endif

#ifndef SYS_connect
#error "The deterministic network boundary requires connect syscall definitions."
#endif

#ifndef SYS_sendto
#error "The deterministic network boundary requires sendto syscall definitions."
#endif

#ifndef SYS_sendmsg
#error "The deterministic network boundary requires sendmsg syscall definitions."
#endif

#ifndef SYS_sendmmsg
#error "The deterministic network boundary requires sendmmsg syscall definitions."
#endif

#ifndef SYS_recvfrom
#error "The deterministic network boundary requires recvfrom syscall definitions."
#endif

#ifndef SYS_recvmsg
#error "The deterministic network boundary requires recvmsg syscall definitions."
#endif

#ifndef SYS_recvmmsg
#error "The deterministic network boundary requires recvmmsg syscall definitions."
#endif

#ifndef SYS_pidfd_open
#error "The deterministic network boundary requires pidfd_open syscall definitions."
#endif

#ifndef SYS_pidfd_getfd
#error "The deterministic network boundary requires pidfd_getfd syscall definitions."
#endif

static const unsigned int dnd_errno = SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA);

/*
 * The architecture check is deliberately a kill action: a filter written for
 * one syscall ABI must never silently run against another ABI. On x86_64 the
 * x32 syscall bit is rejected before syscall-number comparisons. Socket and
 * socketpair allow only AF_UNIX; io_uring is denied as a whole because its
 * submission queue can create a socket without another socket syscall that
 * this filter could inspect. The connect and message syscalls are denied so a
 * local Unix socket cannot proxy or transfer a network descriptor.
 */
static int install_network_filter(void) {
  const struct sock_filter filter[] = {
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch)),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, DND_AUDIT_ARCH, 1, 0),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#if defined(__x86_64__)
      BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, DND_X32_SYSCALL_BIT, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
#endif
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_socket, 0, 4),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[0])),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AF_UNIX, 1, 0),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_socketpair, 0, 4),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[0])),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AF_UNIX, 1, 0),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_io_uring_setup, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_io_uring_enter, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_io_uring_register, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_connect, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_sendto, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_sendmsg, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_sendmmsg, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_recvfrom, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_recvmsg, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_recvmmsg, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_pidfd_open, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_pidfd_getfd, 0, 1),
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

static int close_inherited_descriptors(void) {
  if (syscall(SYS_close_range, 3U, UINT_MAX, 0U) != 0) {
    fprintf(stderr,
            "Raw Swarm deterministic network boundary could not close "
            "inherited descriptors above stderr: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

static int validate_standard_descriptors(void) {
  struct stat null_device;
  if (stat("/dev/null", &null_device) != 0) {
    fprintf(stderr,
            "Raw Swarm deterministic network boundary could not inspect "
            "/dev/null: %s\n",
            strerror(errno));
    return 1;
  }
  if (!S_ISCHR(null_device.st_mode)) {
    fprintf(stderr,
            "Raw Swarm deterministic network boundary found an unexpected "
            "/dev/null file type.\n");
    return 1;
  }
  for (int descriptor = 0; descriptor <= 2; descriptor += 1) {
    struct stat metadata;
    if (fstat(descriptor, &metadata) == 0) {
      if (S_ISREG(metadata.st_mode) || S_ISFIFO(metadata.st_mode) ||
          (S_ISCHR(metadata.st_mode) &&
           (isatty(descriptor) || metadata.st_rdev == null_device.st_rdev))) {
        continue;
      }
      fprintf(stderr,
              "Raw Swarm deterministic network boundary refuses an "
              "unsupported standard descriptor %d.\n",
              descriptor);
      return 1;
    }
    if (errno != EBADF) {
      fprintf(stderr,
              "Raw Swarm deterministic network boundary could not inspect "
              "standard descriptor %d: %s\n",
              descriptor, strerror(errno));
      return 1;
    }
  }
  return 0;
}

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr,
            "Usage: deterministic-network-boundary COMMAND [ARGUMENT ...]\n");
    return 64;
  }
  if (close_inherited_descriptors() != 0 ||
      validate_standard_descriptors() != 0) {
    return 78;
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
