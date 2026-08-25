#define _GNU_SOURCE

#include <errno.h>
#include <limits.h>
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <dirent.h>
#include <signal.h>
#include <sched.h>
#include <time.h>
#include <sys/ioctl.h>
#include <sys/prctl.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#include <linux/audit.h>
#include <linux/capability.h>
#include <linux/filter.h>
#include <linux/if_tun.h>
#include <linux/seccomp.h>

#if !defined(__linux__)
#error "The native process supervisor requires Linux seccomp."
#endif

#if defined(__aarch64__)
#define DND_AUDIT_ARCH AUDIT_ARCH_AARCH64
#elif defined(__x86_64__)
#define DND_AUDIT_ARCH AUDIT_ARCH_X86_64
#else
#error "The native process supervisor has no audited seccomp architecture."
#endif

#if defined(__x86_64__)
#define DND_X32_SYSCALL_BIT 0x40000000U
#endif

#ifndef SYS_io_uring_enter
#error "The native process supervisor requires io_uring syscall definitions."
#endif

#ifndef SYS_io_uring_register
#error "The native process supervisor requires io_uring syscall definitions."
#endif

#ifndef SYS_io_uring_setup
#error "The native process supervisor requires io_uring syscall definitions."
#endif

#ifndef SYS_close_range
#error "The native process supervisor requires close_range syscall definitions."
#endif

#ifndef SYS_connect
#error "The native process supervisor requires connect syscall definitions."
#endif

#ifndef SYS_sendto
#error "The native process supervisor requires sendto syscall definitions."
#endif

#ifndef SYS_sendmsg
#error "The native process supervisor requires sendmsg syscall definitions."
#endif

#ifndef SYS_sendmmsg
#error "The native process supervisor requires sendmmsg syscall definitions."
#endif

#ifndef SYS_recvfrom
#error "The native process supervisor requires recvfrom syscall definitions."
#endif

#ifndef SYS_recvmsg
#error "The native process supervisor requires recvmsg syscall definitions."
#endif

#ifndef SYS_recvmmsg
#error "The native process supervisor requires recvmmsg syscall definitions."
#endif

#ifndef SYS_pidfd_open
#error "The native process supervisor requires pidfd_open syscall definitions."
#endif

#ifndef SYS_pidfd_getfd
#error "The native process supervisor requires pidfd_getfd syscall definitions."
#endif

#ifndef SYS_clone
#error "The native process supervisor requires clone syscall definitions."
#endif

#ifndef SYS_clone3
#error "The native process supervisor requires clone3 syscall definitions."
#endif

#ifndef SYS_setns
#error "The native process supervisor requires setns syscall definitions."
#endif

#ifndef SYS_setpgid
#error "The native process supervisor requires setpgid syscall definitions."
#endif

#ifndef SYS_setsid
#error "The native process supervisor requires setsid syscall definitions."
#endif

#ifndef SYS_unshare
#error "The native process supervisor requires unshare syscall definitions."
#endif

#ifndef SYS_ioctl
#error "The native process supervisor requires ioctl syscall definitions."
#endif

#ifndef SYS_prctl
#error "The native process supervisor requires prctl syscall definitions."
#endif

#ifndef CLONE_NEWNS
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWUTS
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWIPC
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWUSER
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWPID
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWNET
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWCGROUP
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef CLONE_NEWTIME
#error "The native process supervisor requires namespace flag definitions."
#endif

#ifndef TUNSETIFF
#error "The native process supervisor requires TUNSETIFF definitions."
#endif

static const unsigned int dnd_errno = SECCOMP_RET_ERRNO | (EPERM & SECCOMP_RET_DATA);
static const uint32_t dnd_clone_namespace_flags =
    CLONE_NEWNS | CLONE_NEWUTS | CLONE_NEWIPC | CLONE_NEWUSER | CLONE_NEWPID |
    CLONE_NEWNET | CLONE_NEWCGROUP | CLONE_NEWTIME;

/* The same native supervisor is used by the deterministic boundary and by
 * model/API lanes.  Only the former installs this filter; both lanes use the
 * process-tree ownership below. */
static bool dnd_install_network_filter = true;
static bool dnd_cleanup_escalated = false;

/*
 * The architecture check is deliberately a kill action: a filter written for
 * one syscall ABI must never silently run against another ABI. On x86_64 the
 * x32 syscall bit is rejected before syscall-number comparisons. Socket and
 * socketpair allow only AF_UNIX; io_uring is denied as a whole because its
 * submission queue can create a socket without another socket syscall that
 * this filter could inspect. The connect and message syscalls are denied so a
 * local Unix socket cannot proxy or transfer a network descriptor. Session,
 * process-group, namespace-changing, and child-subreaper-changing syscalls
 * are denied so descendants cannot escape the native reaping boundary;
 * TUN/TAP setup is denied at ioctl.
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
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_setsid, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_setpgid, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_setns, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_unshare, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_prctl, 0, 4),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[0])),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, PR_SET_CHILD_SUBREAPER, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_clone, 0, 4),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[0])),
      BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, dnd_clone_namespace_flags, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_clone3, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
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
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_ioctl, 0, 4),
      BPF_STMT(BPF_LD | BPF_W | BPF_ABS,
               offsetof(struct seccomp_data, args[1])),
      BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, TUNSETIFF, 0, 1),
      BPF_STMT(BPF_RET | BPF_K, dnd_errno),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
      BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
  };
  const struct sock_fprog program = {
      .len = (unsigned short)(sizeof(filter) / sizeof(filter[0])),
      .filter = (struct sock_filter *)filter,
  };

  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not enable "
            "no-new-privileges: %s\n",
            strerror(errno));
    return 1;
  }
  if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &program) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not install "
            "the Linux seccomp filter: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

static int close_inherited_descriptors(void) {
  if (syscall(SYS_close_range, 3U, UINT_MAX, 0U) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not close "
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
            "Raw Swarm native process supervisor could not inspect "
            "/dev/null: %s\n",
            strerror(errno));
    return 1;
  }
  if (!S_ISCHR(null_device.st_mode)) {
    fprintf(stderr,
            "Raw Swarm native process supervisor found an unexpected "
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
              "Raw Swarm native process supervisor refuses an "
              "unsupported standard descriptor %d.\n",
              descriptor);
      return 1;
    }
    if (errno != EBADF) {
      fprintf(stderr,
              "Raw Swarm native process supervisor could not inspect "
              "standard descriptor %d: %s\n",
              descriptor, strerror(errno));
      return 1;
    }
  }
  return 0;
}

static int validate_host_prerequisites(void) {
  FILE *status = fopen("/proc/self/status", "r");
  if (status == NULL) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not inspect "
            "effective Linux capabilities: %s\n",
            strerror(errno));
    return 1;
  }
  char line[256];
  unsigned long long effective_capabilities = 0;
  int found_capabilities = 0;
  while (fgets(line, sizeof(line), status) != NULL) {
    if (strncmp(line, "CapEff:", 7) != 0) continue;
    char *end = NULL;
    errno = 0;
    effective_capabilities = strtoull(line + 7, &end, 16);
    if (errno != 0 || end == line + 7) {
      fclose(status);
      fprintf(stderr,
              "Raw Swarm native process supervisor could not parse "
              "effective Linux capabilities.\n");
      return 1;
    }
    found_capabilities = 1;
    break;
  }
  if (fclose(status) != 0 || !found_capabilities) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not establish "
            "the effective Linux capability set.\n");
    return 1;
  }
  const unsigned long long hazardous_capabilities =
      (1ULL << CAP_NET_ADMIN) | (1ULL << CAP_NET_RAW) |
      (1ULL << CAP_SYS_ADMIN);
  if ((effective_capabilities & hazardous_capabilities) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor refuses a host with "
            "elevated network or namespace capabilities.\n");
    return 1;
  }

  int tun_device = open("/dev/net/tun", O_RDWR | O_CLOEXEC);
  if (tun_device >= 0) {
    close(tun_device);
    fprintf(stderr,
            "Raw Swarm native process supervisor refuses an accessible "
            "/dev/net/tun device.\n");
    return 1;
  }
  if (errno != ENOENT && errno != ENODEV && errno != ENXIO &&
      errno != EACCES && errno != EPERM) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not establish "
            "the /dev/net/tun device state: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

/*
 * The native helper is the only lifecycle owner. It remains outside the
 * child seccomp filter so it can fork, signal, and reap. Linux subreaper
 * semantics then reparent every descendant of that command to this helper
 * after the leader exits. The /proc parent-lineage inventory proves ownership
 * even after a descendant creates a new session; waitpid(-1, ...) reaps the
 * complete tree once it has been signaled.
 */
#define DND_SUPERVISOR_SETTLEMENT_TIMEOUT_MILLISECONDS 1000LL
#define DND_SUPERVISOR_POLL_NANOSECONDS 20000000L
#define DND_SUPERVISOR_NON_CLEAN_EXIT 70
#define DND_OWNER_PID_OPTION "--owner-pid"

static volatile sig_atomic_t dnd_pending_signal = 0;

static void dnd_supervisor_signal_handler(int signal_number) {
  if (dnd_pending_signal == 0) dnd_pending_signal = signal_number;
}

static int make_supervisor_signal_set(sigset_t *signals) {
  if (sigemptyset(signals) != 0 || sigaddset(signals, SIGHUP) != 0 ||
      sigaddset(signals, SIGINT) != 0 || sigaddset(signals, SIGTERM) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not construct "
            "its supervisor signal set: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

static int install_supervisor_signal_handlers(void) {
  struct sigaction action;
  memset(&action, 0, sizeof(action));
  if (sigemptyset(&action.sa_mask) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not prepare "
            "supervisor signal handlers: %s\n",
            strerror(errno));
    return 1;
  }
  action.sa_handler = dnd_supervisor_signal_handler;
  if (sigaction(SIGHUP, &action, NULL) != 0 ||
      sigaction(SIGINT, &action, NULL) != 0 ||
      sigaction(SIGTERM, &action, NULL) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not install "
            "supervisor signal handlers: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

static int unblock_supervisor_signals(void) {
  sigset_t handled_signals;
  if (make_supervisor_signal_set(&handled_signals) != 0) return 1;
  if (sigprocmask(SIG_UNBLOCK, &handled_signals, NULL) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not unblock "
            "supervisor signals before startup: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

static int reset_child_signal_handlers(void) {
  struct sigaction action;
  memset(&action, 0, sizeof(action));
  sigemptyset(&action.sa_mask);
  action.sa_handler = SIG_DFL;
  if (sigaction(SIGHUP, &action, NULL) != 0 ||
      sigaction(SIGINT, &action, NULL) != 0 ||
      sigaction(SIGTERM, &action, NULL) != 0) {
    return 1;
  }
  return 0;
}

static int take_pending_signal(void) {
  sigset_t handled_signals;
  if (make_supervisor_signal_set(&handled_signals) != 0) return -1;
  if (sigprocmask(SIG_BLOCK, &handled_signals, NULL) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not block "
            "supervisor signals while taking a snapshot: %s\n",
            strerror(errno));
    return -1;
  }
  const sig_atomic_t pending = dnd_pending_signal;
  dnd_pending_signal = 0;
  if (sigprocmask(SIG_UNBLOCK, &handled_signals, NULL) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not unblock "
            "supervisor signals after a snapshot: %s\n",
            strerror(errno));
    return -1;
  }
  return (int)pending;
}

static int parse_owner_pid(const char *value, pid_t *owner_pid) {
  char *end = NULL;
  errno = 0;
  const long parsed = strtol(value, &end, 10);
  if (errno != 0 || end == value || *end != '\0' || parsed <= 0 ||
      parsed > INT_MAX) {
    fprintf(stderr,
            "Raw Swarm native process supervisor received an invalid "
            "owner PID.\n");
    return 1;
  }
  *owner_pid = (pid_t)parsed;
  return 0;
}

static int configure_parent_death_signal(pid_t expected_parent) {
  if (getppid() != expected_parent) {
    fprintf(stderr,
            "Raw Swarm native process supervisor owner PID no longer "
            "matches its immediate parent.\n");
    return 1;
  }
  if (prctl(PR_SET_PDEATHSIG, SIGTERM, 0, 0, 0) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not configure "
            "the parent-death signal for its owner: %s\n",
            strerror(errno));
    return 1;
  }
  if (getppid() != expected_parent) {
    fprintf(stderr,
            "Raw Swarm native process supervisor owner exited while "
            "the parent-death signal was being configured.\n");
    (void)kill(getpid(), SIGTERM);
    return 1;
  }
  return 0;
}

static long long monotonic_milliseconds(void) {
  struct timespec now;
  if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) return -1;
  return (long long)now.tv_sec * 1000LL + now.tv_nsec / 1000000LL;
}

static int reap_available_children(pid_t leader_pid, bool *leader_reaped,
                                   int *leader_status) {
  for (;;) {
    int status = 0;
    const pid_t child_pid = waitpid(-1, &status, WNOHANG);
    if (child_pid > 0) {
      if (child_pid == leader_pid) {
        *leader_reaped = true;
        *leader_status = status;
      }
      continue;
    }
    if (child_pid == 0) return 1;
    if (errno == ECHILD) return 0;
    if (errno == EINTR) return -2;
    fprintf(stderr,
            "Raw Swarm native process supervisor could not reap an "
            "owned child: %s\n",
            strerror(errno));
    return -1;
  }
}

static int sleep_supervisor_poll(void) {
  struct timespec pause_duration = {
      .tv_sec = 0,
      .tv_nsec = DND_SUPERVISOR_POLL_NANOSECONDS,
  };
  if (nanosleep(&pause_duration, NULL) != 0 && errno != EINTR) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not poll the "
            "owned process tree: %s\n",
            strerror(errno));
    return 1;
  }
  return 0;
}

/*
 * The supervisor is a Linux subreaper, so every descendant that outlives an
 * intermediate parent is reparented to this process. Walk the parent chain
 * from /proc rather than trusting an inherited environment marker, then signal
 * each live descendant and reap it with waitpid(-1, ...). This is deliberately
 * native so a child cannot alter the ownership evidence by changing its
 * JavaScript environment or creating a new session.
 */
#define DND_MAX_PARENT_CHAIN_DEPTH 4096

static int read_process_parent(pid_t process_id, pid_t *parent_id,
                               char *process_state) {
  char stat_path[64];
  if (snprintf(stat_path, sizeof(stat_path), "/proc/%ld/stat",
               (long)process_id) >= (int)sizeof(stat_path)) {
    return 1;
  }
  FILE *stat = fopen(stat_path, "r");
  if (stat == NULL) return 1;
  char line[4096];
  const int read = fgets(line, sizeof(line), stat) != NULL;
  const int close_status = fclose(stat);
  if (!read || close_status != 0) return 1;
  char *closing_parenthesis = strrchr(line, ')');
  if (closing_parenthesis == NULL) return 1;
  char state = '\0';
  long parsed_parent = 0;
  if (sscanf(closing_parenthesis + 1, " %c %ld", &state, &parsed_parent) !=
          2 ||
      parsed_parent <= 0 || parsed_parent > INT_MAX) {
    return 1;
  }
  *parent_id = (pid_t)parsed_parent;
  if (process_state != NULL) *process_state = state;
  return 0;
}

static bool process_is_descendant(pid_t process_id, pid_t supervisor_id) {
  pid_t current = process_id;
  for (int depth = 0; depth < DND_MAX_PARENT_CHAIN_DEPTH; depth += 1) {
    if (current == supervisor_id) return process_id != supervisor_id;
    pid_t parent_id = 0;
    if (read_process_parent(current, &parent_id, NULL) != 0) return false;
    if (parent_id == current || parent_id <= 1) return false;
    current = parent_id;
  }
  return false;
}

static int collect_owned_descendants(pid_t supervisor_id, pid_t **process_ids,
                                     size_t *process_count) {
  DIR *proc = opendir("/proc");
  if (proc == NULL) {
    fprintf(stderr,
            "Raw Swarm process supervisor could not inspect /proc while "
            "proving descendant ownership: %s\n",
            strerror(errno));
    return 1;
  }
  pid_t *owned = NULL;
  size_t count = 0;
  struct dirent *entry = NULL;
  while ((entry = readdir(proc)) != NULL) {
    char *end = NULL;
    errno = 0;
    const long parsed_pid = strtol(entry->d_name, &end, 10);
    if (errno != 0 || end == entry->d_name || *end != '\0' || parsed_pid <= 1 ||
        parsed_pid > INT_MAX) {
      continue;
    }
    const pid_t process_id = (pid_t)parsed_pid;
    if (!process_is_descendant(process_id, supervisor_id)) continue;
    pid_t *expanded = realloc(owned, (count + 1) * sizeof(*expanded));
    if (expanded == NULL) {
      free(owned);
      (void)closedir(proc);
      fprintf(stderr,
              "Raw Swarm process supervisor could not allocate its owned "
              "descendant inventory.\n");
      return 1;
    }
    owned = expanded;
    owned[count] = process_id;
    count += 1;
  }
  const int close_status = closedir(proc);
  if (close_status != 0) {
    free(owned);
    fprintf(stderr,
            "Raw Swarm process supervisor could not finish its /proc "
            "descendant inventory: %s\n",
            strerror(errno));
    return 1;
  }
  *process_ids = owned;
  *process_count = count;
  return 0;
}

static int owned_descendants_exist(pid_t supervisor_id) {
  pid_t *process_ids = NULL;
  size_t process_count = 0;
  const int collected = collect_owned_descendants(
      supervisor_id, &process_ids, &process_count);
  free(process_ids);
  if (collected != 0) return -1;
  return process_count == 0 ? 0 : 1;
}

/* Returns 0 when no owned children remain, 1 while children remain, 2 on a
 * bounded timeout, and -1 on an unrecoverable wait/clock error. */
static int wait_for_owned_tree_empty(pid_t supervisor_pid, pid_t leader_pid,
                                     bool *leader_reaped, int *leader_status,
                                     int *interrupted_signal) {
  const long long started = monotonic_milliseconds();
  if (started < 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not read the "
            "monotonic supervisor clock: %s\n",
            strerror(errno));
    return -1;
  }
  const long long deadline =
      started + DND_SUPERVISOR_SETTLEMENT_TIMEOUT_MILLISECONDS;
  for (;;) {
    const int reaped =
        reap_available_children(leader_pid, leader_reaped, leader_status);
    if (reaped == 0) {
      const int descendants = owned_descendants_exist(supervisor_pid);
      if (descendants < 0) return -1;
      if (descendants != 0) {
        /* A reparented descendant is still owned even when no child is
         * immediately waitable.  Keep polling until it exits or cleanup
         * signals it. */
      } else {
        const int pending_signal = take_pending_signal();
        if (pending_signal < 0) return -1;
        if (pending_signal != 0) *interrupted_signal = pending_signal;
        return 0;
      }
    }
    if (reaped == -1) return -1;
    const int pending_signal = take_pending_signal();
    if (pending_signal < 0) return -1;
    if (pending_signal != 0) *interrupted_signal = pending_signal;
    const long long now = monotonic_milliseconds();
    if (now < 0) {
      fprintf(stderr,
              "Raw Swarm native process supervisor could not read the "
              "monotonic supervisor clock: %s\n",
              strerror(errno));
      return -1;
    }
    if (now >= deadline) return 2;
    if (sleep_supervisor_poll() != 0) return -1;
  }
}

/* The helper always attempts TERM, then KILL, and reaps after each bounded
 * window. Returning nonzero means the owned tree could not be proved settled. */
static int signal_owned_descendants(pid_t supervisor_id, int signal_number) {
  pid_t *process_ids = NULL;
  size_t process_count = 0;
  if (collect_owned_descendants(supervisor_id, &process_ids, &process_count) !=
      0) {
    return 1;
  }
  int failure = 0;
  for (size_t index = 0; index < process_count; index += 1) {
    if (kill(process_ids[index], signal_number) != 0 && errno != ESRCH) {
      fprintf(stderr,
              "Raw Swarm process supervisor could not send %s to owned "
              "descendant %ld: %s\n",
              strsignal(signal_number), (long)process_ids[index],
              strerror(errno));
      failure = 1;
    }
  }
  free(process_ids);
  return failure;
}

static int signal_owned_tree(pid_t supervisor_id, int signal_number) {
  return signal_owned_descendants(supervisor_id, signal_number);
}

static int terminate_owned_tree(pid_t supervisor_id, pid_t leader_pid,
                                bool *leader_reaped, int *leader_status,
                                int initial_signal, int *observed_signal) {
  if (observed_signal != NULL) *observed_signal = 0;
  dnd_cleanup_escalated = false;
  if (signal_owned_tree(supervisor_id, initial_signal) != 0)
    return 1;
  int interrupted_signal = 0;
  int settlement = wait_for_owned_tree_empty(supervisor_id, leader_pid,
                                             leader_reaped, leader_status,
                                             &interrupted_signal);
  if (observed_signal != NULL && interrupted_signal != 0)
    *observed_signal = interrupted_signal;
  if (settlement == 0) return 0;
  dnd_cleanup_escalated = true;
  bool cleanup_warning_emitted = false;
  for (;;) {
    if (signal_owned_tree(supervisor_id, SIGKILL) != 0 &&
        !cleanup_warning_emitted) {
      fprintf(stderr,
              "Raw Swarm process supervisor could not prove that SIGKILL "
              "reached every owned descendant; retaining ownership.\n");
      cleanup_warning_emitted = true;
    }
    interrupted_signal = 0;
    settlement = wait_for_owned_tree_empty(supervisor_id, leader_pid,
                                            leader_reaped, leader_status,
                                            &interrupted_signal);
    if (observed_signal != NULL && interrupted_signal != 0)
      *observed_signal = interrupted_signal;
    if (settlement == 0) return 0;
    if (!cleanup_warning_emitted) {
      fprintf(stderr,
              "Raw Swarm process supervisor could not prove that its "
              "owned process tree settled; retaining ownership.\n");
      cleanup_warning_emitted = true;
    }
    /* A nonzero settlement result means ownership could not be proved empty.
     * Keep the supervisor alive and retry rather than releasing a lock while
     * an unkillable or temporarily unobservable descendant may survive. */
  }
}

static int status_for_reaped_leader(int status) {
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
  return 1;
}

static int supervise_command(char **command_argv) {
  if (prctl(PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not become the "
            "Linux child subreaper: %s\n",
            strerror(errno));
    return 78;
  }
  const int setup_signal = take_pending_signal();
  if (setup_signal < 0) return 78;
  if (setup_signal != 0) return 128 + setup_signal;

  const pid_t supervisor_pid = getpid();
  const pid_t leader_pid = fork();
  if (leader_pid < 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not fork its "
            "supervised command: %s\n",
            strerror(errno));
    return 78;
  }
  if (leader_pid == 0) {
    if (reset_child_signal_handlers() != 0) _exit(126);
    if (configure_parent_death_signal(supervisor_pid) != 0) _exit(143);
    if (dnd_install_network_filter && install_network_filter() != 0)
      _exit(78);
    execvp(command_argv[0], command_argv);
    fprintf(stderr,
            "Raw Swarm native process supervisor could not execute %s: "
            "%s\n",
            command_argv[0], strerror(errno));
    _exit(127);
  }

  bool leader_reaped = false;
  int leader_status = 0;

  int requested_signal = 0;
  while (!leader_reaped) {
    requested_signal = take_pending_signal();
    if (requested_signal < 0) {
      int ignored_signal = 0;
      (void)terminate_owned_tree(supervisor_pid, leader_pid, &leader_reaped,
                                 &leader_status, SIGTERM, &ignored_signal);
      return 1;
    }
    if (requested_signal != 0) break;
    int status = 0;
    const pid_t child_pid = waitpid(-1, &status, WNOHANG);
    if (child_pid == leader_pid) {
      leader_reaped = true;
      leader_status = status;
      break;
    }
    if (child_pid > 0) continue;
    if (child_pid == 0) {
      if (sleep_supervisor_poll() != 0) {
        int cleanup_signal = 0;
        const int cleanup_failure = terminate_owned_tree(
            supervisor_pid, leader_pid, &leader_reaped, &leader_status,
            SIGTERM, &cleanup_signal);
        if (cleanup_failure != 0) {
          fprintf(stderr,
                  "Raw Swarm native process supervisor could not poll "
                  "before leader wait, and cleanup also failed.\n");
        } else {
          fprintf(stderr,
                  "Raw Swarm native process supervisor could not poll "
                  "before leader wait; cleanup settled the owned process "
                  "tree.\n");
        }
        return 1;
      }
      continue;
    }
    if (errno == EINTR) continue;
    if (errno == ECHILD) {
      fprintf(stderr,
              "Raw Swarm native process supervisor lost its supervised "
              "leader before it could reap it.\n");
      return 1;
    }
    fprintf(stderr,
            "Raw Swarm native process supervisor could not wait for its "
            "supervised command: %s\n",
            strerror(errno));
    return 1;
  }

  if (requested_signal != 0) {
    int cleanup_signal = 0;
    if (terminate_owned_tree(supervisor_pid, leader_pid, &leader_reaped,
                             &leader_status, requested_signal,
                             &cleanup_signal) != 0) {
      fprintf(stderr,
              "Raw Swarm native process supervisor could not settle the "
              "owned process tree after %s.\n",
              strsignal(requested_signal));
      return 1;
    }
    return dnd_cleanup_escalated && !dnd_install_network_filter
               ? 137
               : 128 + (cleanup_signal == 0 ? requested_signal : cleanup_signal);
  }

  int interrupted_signal = 0;
  int settlement = wait_for_owned_tree_empty(
      supervisor_pid, leader_pid, &leader_reaped, &leader_status,
      &interrupted_signal);
  if (interrupted_signal != 0) {
    int cleanup_signal = 0;
    if (terminate_owned_tree(supervisor_pid, leader_pid, &leader_reaped,
                             &leader_status, interrupted_signal,
                             &cleanup_signal) != 0) {
      fprintf(stderr,
              "Raw Swarm native process supervisor could not settle the "
              "owned process tree after %s.\n",
              strsignal(interrupted_signal));
      return 1;
    }
    return dnd_cleanup_escalated && !dnd_install_network_filter
               ? 137
               : 128 +
                     (cleanup_signal == 0 ? interrupted_signal : cleanup_signal);
  }
  if (settlement == 0) {
    const int late_signal = take_pending_signal();
    if (late_signal < 0) return 1;
    if (late_signal != 0) {
      int cleanup_signal = 0;
      if (terminate_owned_tree(supervisor_pid, leader_pid, &leader_reaped,
                               &leader_status, late_signal,
                               &cleanup_signal) != 0) {
        fprintf(stderr,
                "Raw Swarm native process supervisor could not settle "
                "the owned process tree after %s.\n",
                strsignal(late_signal));
        return 1;
      }
      return dnd_cleanup_escalated && !dnd_install_network_filter
                 ? 137
                 : 128 + (cleanup_signal == 0 ? late_signal : cleanup_signal);
    }
    return status_for_reaped_leader(leader_status);
  }
  int cleanup_signal = 0;
  if (settlement < 0 ||
      terminate_owned_tree(supervisor_pid, leader_pid, &leader_reaped,
                           &leader_status, SIGTERM, &cleanup_signal) != 0) {
    fprintf(stderr,
            "Raw Swarm native process supervisor could not settle the "
            "owned process tree after the leader exited.\n");
    return 1;
  }
  if (dnd_cleanup_escalated && !dnd_install_network_filter) return 137;
  if (cleanup_signal != 0) return 128 + cleanup_signal;
  fprintf(stderr,
          "Raw Swarm native process supervisor terminated descendant "
          "processes after the leader exited; the phase is non-clean.\n");
  return DND_SUPERVISOR_NON_CLEAN_EXIT;
}

int main(int argc, char **argv) {
  if (argc < 4 || strcmp(argv[1], DND_OWNER_PID_OPTION) != 0) {
    fprintf(stderr,
            "Usage: process-supervisor --owner-pid PID "
            "[--supervise-only] COMMAND [ARGUMENT ...]\n");
    return 64;
  }
  pid_t owner_pid = 0;
  if (parse_owner_pid(argv[2], &owner_pid) != 0) return 64;
  if (install_supervisor_signal_handlers() != 0 ||
      unblock_supervisor_signals() != 0) {
    return 78;
  }
  if (configure_parent_death_signal(owner_pid) != 0) return 78;
  int command_index = 3;
  if (argc > command_index &&
      strcmp(argv[command_index], "--supervise-only") == 0) {
    dnd_install_network_filter = false;
    command_index += 1;
  }
  if (argc <= command_index) {
    fprintf(stderr,
            "Usage: process-supervisor --owner-pid PID "
            "[--supervise-only] COMMAND [ARGUMENT ...]\n");
    return 64;
  }
  if (dnd_install_network_filter) {
    if (close_inherited_descriptors() != 0 ||
        validate_standard_descriptors() != 0) {
      return 78;
    }
    if (validate_host_prerequisites() != 0) return 78;
  }
  return supervise_command(&argv[command_index]);
}
