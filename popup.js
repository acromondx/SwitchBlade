const currentExtensionId = chrome.runtime.id;

function canModifyExtension(ext) {
  return (
    !ext.isApp &&
    ext.type === "extension" &&
    ext.id !== currentExtensionId &&
    !ext.mayDisable === false
  );
}

function toggleExtension(extensionId, enable, callback) {
  chrome.management.setEnabled(extensionId, enable, () => {
    if (chrome.runtime.lastError) {
      console.log(
        `Cannot modify extension: ${chrome.runtime.lastError.message}`
      );
    } else {
      callback?.();
    }
  });
}

let currentHostname = "";
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.url) {
    const url = new URL(tabs[0].url);
    currentHostname = url.hostname;
    document.getElementById("current-site").textContent = currentHostname;

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${currentHostname}&sz=16`;
    const faviconImg = document.getElementById("site-favicon");
    faviconImg.src = faviconUrl;
  }
});

chrome.management.getAll((extensions) => {
  const listDiv = document.getElementById("extension-list");

  chrome.storage.local.get("siteDisabledExtensions", (data) => {
    const siteDisabledExtensions = data.siteDisabledExtensions || {};
    const currentSiteDisabled = siteDisabledExtensions[currentHostname] || {};

    const sortedExtensions = extensions
      .filter((ext) => canModifyExtension(ext))
      .sort((a, b) => a.name.localeCompare(b.name));

    sortedExtensions.forEach((ext) => {
      const div = document.createElement("div");
      div.className = "extension-item";

      const infoDiv = document.createElement("div");
      infoDiv.className = "extension-info";

      const icon = document.createElement("img");
      icon.className = "extension-icon";
      const iconUrl = ext.icons ? ext.icons[ext.icons.length - 1].url : "";
      icon.src = iconUrl;
      icon.alt = `${ext.name} icon`;

      const nameSpan = document.createElement("span");
      nameSpan.className = "extension-name";
      nameSpan.innerText = ext.name;

      const label = document.createElement("label");
      label.className = "switch";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !currentSiteDisabled[ext.id];
      input.dataset.id = ext.id;

      const slider = document.createElement("span");
      slider.className = "slider";

      label.appendChild(input);
      label.appendChild(slider);

      infoDiv.appendChild(icon);
      infoDiv.appendChild(nameSpan);
      div.appendChild(infoDiv);
      div.appendChild(label);
      listDiv.appendChild(div);

      input.addEventListener("change", (e) => {
        const newDisabledState = !e.target.checked;
        chrome.storage.local.get("siteDisabledExtensions", (data) => {
          const siteDisabledExtensions = data.siteDisabledExtensions || {};
          const currentSiteDisabled =
            siteDisabledExtensions[currentHostname] || {};

          const updatedSiteDisabled = {
            ...siteDisabledExtensions,
            [currentHostname]: {
              ...currentSiteDisabled,
              [ext.id]: newDisabledState,
            },
          };

          chrome.storage.local.set(
            { siteDisabledExtensions: updatedSiteDisabled },
            () => {
              toggleExtension(ext.id, !newDisabledState);
            }
          );
        });
      });
    });
  });
});

document.getElementById("enable-all").addEventListener("click", () => {
  chrome.storage.local.get("siteDisabledExtensions", (data) => {
    const siteDisabledExtensions = data.siteDisabledExtensions || {};
    delete siteDisabledExtensions[currentHostname];

    chrome.storage.local.set({ siteDisabledExtensions }, () => {
      chrome.management.getAll((extensions) => {
        extensions.forEach((ext) => {
          if (canModifyExtension(ext)) {
            toggleExtension(ext.id, true);
          }
        });
      });
      const switches = document.querySelectorAll('input[type="checkbox"]');
      switches.forEach((s) => (s.checked = true));
    });
  });
});

document.getElementById("disable-all").addEventListener("click", () => {
  chrome.management.getAll((extensions) => {
    const disabledState = {};
    extensions.forEach((ext) => {
      if (canModifyExtension(ext)) {
        disabledState[ext.id] = true;
      }
    });

    chrome.storage.local.get("siteDisabledExtensions", (data) => {
      const siteDisabledExtensions = data.siteDisabledExtensions || {};

      const updatedSiteDisabled = {
        ...siteDisabledExtensions,
        [currentHostname]: disabledState,
      };

      chrome.storage.local.set(
        { siteDisabledExtensions: updatedSiteDisabled },
        () => {
          Object.keys(disabledState).forEach((extId) => {
            toggleExtension(extId, false);
          });
          const switches = document.querySelectorAll('input[type="checkbox"]');
          switches.forEach((s) => (s.checked = false));
        }
      );
    });
  });
});
