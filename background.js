chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ siteDisabledExtensions: {} });
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
    });
  }
});

 chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      const prevHostname = tab.url;

       chrome.storage.local.get("siteDisabledExtensions", (data) => {
        const siteDisabledExtensions = data.siteDisabledExtensions || {};

         Object.values(siteDisabledExtensions).forEach((siteExtensions) => {
          Object.entries(siteExtensions).forEach(([extId, shouldDisable]) => {
            if (shouldDisable) {
              chrome.management.setEnabled(extId, true);
            }
          });
        });

         const currentHostname = new URL(tab.url).hostname;
        const currentSiteDisabled =
          siteDisabledExtensions[currentHostname] || {};
        Object.entries(currentSiteDisabled).forEach(
          ([extId, shouldDisable]) => {
            if (shouldDisable) {
              chrome.management.setEnabled(extId, false);
            }
          }
        );
      });
    }
  });
});
