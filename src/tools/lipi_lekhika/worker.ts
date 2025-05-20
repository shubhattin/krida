import * as functions from './lekhika_core';
import type { ArgUUID } from './types';

self.onmessage = async function (event) {
  const input: ArgUUID<keyof typeof functions> = event.data;
  const function_names = Object.keys(functions) as (keyof typeof functions)[];
  for (const func_name of function_names) {
    if (func_name === input.func_name) {
      // @ts-ignore
      const result = await functions[func_name](...input.args);
      self.postMessage({
        func_name: input.func_name,
        uuid: input.uuid,
        response: result
      });
      break;
    }
  }
};
