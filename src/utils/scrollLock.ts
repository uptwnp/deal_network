// Utility to lock/unlock body scroll when modals are open
// Uses a counter to handle nested modals properly

let scrollLockCount = 0;
let scrollPosition = 0;

export function lockBodyScroll() {
  scrollLockCount++;
  if (scrollLockCount === 1) {
    // Save current scroll position
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Apply scroll lock - only use overflow hidden to preserve modal scrolling
    document.body.style.overflow = 'hidden';
    // Store the scroll position in a data attribute for reference
    document.body.setAttribute('data-scroll-lock-position', String(scrollPosition));
    document.body.classList.add('modal-open');
  }
}

export function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    // Get stored scroll position
    const storedPosition = document.body.getAttribute('data-scroll-lock-position');
    const targetScroll = storedPosition ? parseInt(storedPosition, 10) : scrollPosition;

    // Remove scroll lock
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-lock-position');
    document.body.classList.remove('modal-open');

    // Restore scroll position
    window.scrollTo(0, targetScroll);
  }
}

