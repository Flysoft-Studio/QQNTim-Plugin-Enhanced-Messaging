export const id = "enhanced-messaging" as const;

export const defaults: PluginConfig = {};
export function getPluginConfig(config: Config | undefined) {
    return Object.assign({}, defaults, config?.[id] || {});
}

export type PluginConfig = {};
export type Config = {
    [X in typeof id]?: Partial<PluginConfig>;
};
