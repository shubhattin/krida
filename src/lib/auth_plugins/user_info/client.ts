import type { BetterAuthClientPlugin } from 'better-auth';

type user_plugin_type = () => {
  id: 'additional_user_info';
  schema: {
    user: {
      fields: {
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
    // SAFETY: server plugin shape is fully declared by user_plugin_type above
    $InferServerPlugin: {} as ReturnType<user_plugin_type>
  } satisfies BetterAuthClientPlugin;
};
