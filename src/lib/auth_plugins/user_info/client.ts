import type { BetterAuthClientPlugin } from 'better-auth';

type user_plugin_type = () => {
  id: 'additional_user_info';
  schema: {
    user: {
      fields: {
        is_approved: {
          type: 'boolean';
          defaultValue: false;
        };
        is_maintainer: {
          type: 'boolean';
          defaultValue: false;
        };
      };
    };
  };
};
export const userInfoPluginClient = () => {
  return {
    id: 'additional_user_info',
    $InferServerPlugin: {} as ReturnType<user_plugin_type>
  } satisfies BetterAuthClientPlugin;
};
