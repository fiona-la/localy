// if we are on amazon cart's we inject
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isUrl = /^https:\/\/www\.amazon\.ca\/gp\/cart\/view\.html/.test(tab.url);
  const isLoading = changeInfo.status === "loading";

  if (isUrl && isLoading) {
    chrome.tabs.insertCSS(null, { file: "./css/fontawesome.min.css" });
    chrome.tabs.insertCSS(null, { file: "./css/solid.min.css" });
    chrome.tabs.insertCSS(null, { file: "./css/foreground.css" });
    chrome.tabs.executeScript(null, { file: "./foreground.js" });
  }
});
