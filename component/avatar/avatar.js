export const escapeHtml = value =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

export const getInitial = name => {
    const initial = String(name ?? '').trim().charAt(0);
    return initial || '?';
};

export const renderAvatar = (name, imgUrl, extraClass = '') => {
    const safeName = escapeHtml(name);
    const safeImgUrl = escapeHtml(String(imgUrl ?? '').trim());
    const initial = escapeHtml(getInitial(name));
    const classes = ['initialAvatar', extraClass].filter(Boolean).join(' ');

    if (!safeImgUrl) {
        return `<div class="${classes}" aria-hidden="true">${initial}</div>`;
    }

    return `
        <div class="${classes} profileAvatar" data-initial="${initial}">
            <img
                src="${safeImgUrl}"
                alt="${safeName} 프로필 사진"
                onerror="const avatar=this.parentElement; avatar.classList.remove('profileAvatar'); avatar.textContent=avatar.dataset.initial || '?';"
            />
        </div>
    `;
};
