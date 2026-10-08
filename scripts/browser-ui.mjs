// Shared interactions follow the visible menus, including touch-sized browsers.
export async function openApplicationMenu(page, name) {
  const trigger = page
    .getByRole("menubar", { name: "Application menu" })
    .getByRole("menuitem", { name, exact: true });
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  return page.getByRole("menu", { name, exact: true });
}

export async function enterEditMode(page) {
  const menu = await openApplicationMenu(page, "Develop");
  const enter = menu.getByRole("menuitemcheckbox", {
    name: "Enter Edit Mode",
    exact: true,
  });
  if (await enter.count()) await enter.click();
  else await menu.press("Escape");
}

export async function historyAction(page, name) {
  const menu = await openApplicationMenu(page, "Edit");
  await menu
    .getByRole("menuitem", { name: new RegExp(`^${name}(?: |$)`) })
    .click();
}

export async function historyInfo(page) {
  const menu = await openApplicationMenu(page, "Edit");
  const read = async (name) => {
    const item = menu.getByRole("menuitem", {
      name: new RegExp(`^${name}(?: |$)`),
    });
    const description = item.locator(".app-menu-item-detail");
    return {
      disabled: (await item.getAttribute("aria-disabled")) === "true",
      label: (await description.count()) ? await description.innerText() : "",
    };
  };
  const result = { undo: await read("Undo"), redo: await read("Redo") };
  await menu.press("Escape");
  return result;
}

export async function offlineBuildStatus(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error("No active offline worker");
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("Offline build status timed out"));
      }, 15_000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      registration.active.postMessage({ type: "HVACR_OFFLINE_STATUS" }, [
        channel.port2,
      ]);
    });
  });
}
