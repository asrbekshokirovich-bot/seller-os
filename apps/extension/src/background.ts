// Kengaytma orqa xizmati — hozircha oddiy.
// Kelajakda: sessiya boshqarish, token saqlash.

chrome.action?.onClicked?.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { tur: 'toggle' });
  }
});
