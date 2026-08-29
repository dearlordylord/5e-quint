#!/usr/bin/env bash

load_dokku_environment() {
  if (( $# != 1 )); then
    echo "load_dokku_environment requires staging or production" >&2
    return 64
  fi

  deployment_environment="$1"
  dokku_host="49.13.172.86"
  case "$deployment_environment" in
    staging)
      dokku_app="dnd-oracle-staging"
      public_origin="https://dnd-oracle-staging.apps.loskutoff.com"
      ;;
    production)
      dokku_app="dnd-oracle"
      public_origin="https://dnd-oracle.apps.loskutoff.com"
      ;;
    *)
      echo "load_dokku_environment requires staging or production" >&2
      return 64
      ;;
  esac
  dokku_remote="dokku-oracle-$deployment_environment"
  dokku_remote_url="dokku@$dokku_host:$dokku_app"
  expected_storage_mount="-v /var/lib/dokku/data/storage/$dokku_app:/var/lib/dnd-oracle"

  readonly deployment_environment dokku_host dokku_app
  readonly public_origin dokku_remote dokku_remote_url expected_storage_mount
}
