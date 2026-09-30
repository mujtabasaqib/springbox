// Entry for the <script> tag build. Auto-inits from data attributes on its own tag.
import { destroy, init, mount, scan } from './index';
import { connectWallet } from './wallet';

const tag = document.currentScript as HTMLScriptElement | null;
if (tag?.dataset.publisherId) {
  init({
    publisherId: tag.dataset.publisherId,
    apiUrl: tag.dataset.apiUrl,
    debug: tag.dataset.debug === 'true',
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }
}

export { init, mount, scan, destroy, connectWallet };