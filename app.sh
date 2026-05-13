#!/bin/bash

CLI=$1

pnpm build
pm2 "${CLI}" v