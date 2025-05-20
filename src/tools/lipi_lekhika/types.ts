import type * as functions from './lekhika_core';

export type Arg<F extends keyof typeof functions> = {
  func_name: F;
  args: Parameters<(typeof functions)[F]>;
};

export type ArgUUID<F extends keyof typeof functions> = {
  func_name: F;
  args: Parameters<(typeof functions)[F]>;
  uuid: string;
};
