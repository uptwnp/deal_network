// Clear all cached filter data
// Paste this in your browser console (F12 -> Console tab)

console.log("Clearing all filter caches...");

// Remove all filter-related localStorage items
localStorage.removeItem('search_filters');
localStorage.removeItem('search_query');
localStorage.removeItem('search_column');
localStorage.removeItem('selected_area');

console.log("✅ Cache cleared!");
console.log("Reloading page...");

// Reload the page
location.reload();
