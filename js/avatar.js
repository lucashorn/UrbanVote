// ─── Avatar Upload & Cropper Module ──────────────────────────────────────────

let avatarCropper = null;
let cropperMinZoom = 0;
let cropperMaxZoom = 0;

document.getElementById("mgmtAvatarInput").onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const cropImage = document.getElementById("cropImage");
            cropImage.src = ev.target.result;
            document.getElementById("mgmtAvatarPreview").dataset.original = ev.target.result;

            document.getElementById("cropModal").style.display = "flex";

            if (avatarCropper) {
                avatarCropper.destroy();
                avatarCropper = null;
            }

            setTimeout(() => {
                avatarCropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.8,
                    restore: false,
                    guides: false,
                    center: false,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    ready() {
                        const imageData = avatarCropper.getImageData();
                        cropperMinZoom = imageData.width / imageData.naturalWidth;
                        cropperMaxZoom = cropperMinZoom * 4;
                        document.getElementById("zoomSlider").value = 0;
                    },
                    zoom(event) {
                        if (cropperMinZoom && cropperMaxZoom) {
                            const ratio = event.detail.ratio;
                            const pct = ((ratio - cropperMinZoom) / (cropperMaxZoom - cropperMinZoom)) * 100;
                            document.getElementById("zoomSlider").value = Math.max(0, Math.min(100, pct));
                        }
                    }
                });
            }, 50);
        };
        reader.readAsDataURL(file);
    }
};

document.getElementById("zoomInBtn").onclick = () => {
    if (avatarCropper) avatarCropper.zoom(0.1);
};

document.getElementById("zoomOutBtn").onclick = () => {
    if (avatarCropper) avatarCropper.zoom(-0.1);
};

document.getElementById("zoomSlider").oninput = (e) => {
    if (avatarCropper && cropperMinZoom && cropperMaxZoom) {
        const val = parseFloat(e.target.value);
        const targetZoom = cropperMinZoom + (val / 100) * (cropperMaxZoom - cropperMinZoom);
        avatarCropper.zoomTo(targetZoom);
    }
};

document.getElementById("cropClose").onclick = () => {
    document.getElementById("cropModal").style.display = "none";
    if (avatarCropper) {
        avatarCropper.destroy();
        avatarCropper = null;
    }
    document.getElementById("mgmtAvatarInput").value = "";
};

document.getElementById("cropConfirmBtn").onclick = () => {
    if (avatarCropper) {
        const canvas = avatarCropper.getCroppedCanvas({
            width: 300,
            height: 300
        });

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        document.getElementById("mgmtAvatarPreview").src = croppedDataUrl;
        
        document.getElementById("cropModal").style.display = "none";
        avatarCropper.destroy();
        avatarCropper = null;
        
        handleAvatarUploadSubmit(croppedDataUrl, document.getElementById("mgmtAvatarPreview").dataset.original);
    }
};

async function handleAvatarUploadSubmit(imgData, originalImgData) {
    const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
    if (!auth) return;
    
    const activeName = auth.player_name || auth.username;
    if (!activeName) return;
    
    try {
        const res = await fetch(`${API_URL}/upload-avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: activeName,
                username: auth.username,
                session_token: auth.session_token,
                image: imgData,
                originalImage: originalImgData
            })
        });
        if (res.ok) {
            showToast("success", "Foto de perfil atualizada!");
            location.reload();
        } else {
            showToast("error", await res.text());
        }
    } catch (e) {
        showToast("error", "Erro ao enviar imagem.");
    }
}
