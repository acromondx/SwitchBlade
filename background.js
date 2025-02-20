chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ siteDisabledExtensions: {} });
  updateBadge();
});

async function updateBadge() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      const hostname = new URL(tab.url).hostname;
      const { siteDisabledExtensions } = await chrome.storage.local.get(
        "siteDisabledExtensions"
      );

      const hasDisabledExtensions =
        siteDisabledExtensions[hostname] &&
        Object.values(siteDisabledExtensions[hostname]).some(
          (disabled) => disabled
        );

      chrome.action.setBadgeBackgroundColor({
        color: hasDisabledExtensions ? "#ff4500" : "#4CAF50",
      });
      chrome.action.setBadgeText({ text: hasDisabledExtensions ? "ON" : "" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error("Error updating badge:", error);
    chrome.action.setBadgeText({ text: "" });
  }
}

chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateBadge();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url);
    const hostname = url.hostname;

    chrome.storage.local.get("siteDisabledExtensions", (data) => {
      const siteDisabledExtensions = data.siteDisabledExtensions || {};
      const disabledExtensions = siteDisabledExtensions[hostname] || {};

      Object.entries(disabledExtensions).forEach(([extId, shouldDisable]) => {
        if (shouldDisable) {
          chrome.management.setEnabled(extId, false);
        }
      });
      updateBadge();
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (tab.url) {
      const currentHostname = new URL(tab.url).hostname;

      const { siteDisabledExtensions } = await chrome.storage.local.get(
        "siteDisabledExtensions"
      );

      const allSiteExtensions = Object.values(siteDisabledExtensions).flatMap(
        (site) => Object.entries(site)
      );

      for (const [extId] of allSiteExtensions) {
        await chrome.management.setEnabled(extId, true);
      }

      const currentSiteDisabled = siteDisabledExtensions[currentHostname] || {};
      for (const [extId, shouldDisable] of Object.entries(
        currentSiteDisabled
      )) {
        if (shouldDisable) {
          await chrome.management.setEnabled(extId, false);
        }
      }

      updateBadge();
    }
  });
});
