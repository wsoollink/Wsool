/** Browser event fired after a dashboard card saves, so the Edit page preview can reload. */
export const SAVED_EVENT = "wsool:saved";
export const notifySaved = () => window.dispatchEvent(new Event(SAVED_EVENT));
