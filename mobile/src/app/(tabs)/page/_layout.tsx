import { TabStack } from "../../../components/TabStack";

/** Index first, so a section opened from another tab still goes back to this tab's first screen. */
export const unstable_settings = { initialRouteName: "index" };

export default TabStack;
