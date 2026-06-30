// ─── Utils / Generic Helpers ─────────────────────────────────────────────────

// Toast helper (SweetAlert2)
const Toast = (typeof Swal !== "undefined") ? Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
    }
}) : null;

/**
 * @param {"success"|"error"|"warning"|"info"} icon
 * @param {string} message
 */
function showToast(icon, message) {
    if (Toast) {
        Toast.fire({ icon, title: message });
    } else {
        alert(message);
    }
}

function generateBrowserId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function formatDateToBR(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split(" ");
    if (parts.length !== 2) return dateStr;
    const dateParts = parts[0].split("-");
    if (dateParts.length !== 3) return dateStr;
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getMapImage(map) {
    return `img/${mapImages[map] || "placeholder.jpg"}`;
}
