import { padTo2Digits } from '../../utils/function.js';

const escapeHtml = value =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatRelativeDate = date => {
    const dateObj = new Date(date);
    const diff = Date.now() - dateObj.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (Number.isNaN(dateObj.getTime())) return '';
    if (diff < minute) return '방금 전';
    if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
    if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
    if (diff < day * 7) return `${Math.floor(diff / day)}일 전`;

    return `${dateObj.getFullYear()}.${padTo2Digits(dateObj.getMonth() + 1)}.${padTo2Digits(dateObj.getDate())}`;
};

const BoardItem = (
    postId,
    date,
    title,
    viewCount,
    imgUrl,
    writer,
    commentCount,
    likeCount,
) => {
    // 파라미터 값이 없으면 리턴
    if (
        !date ||
        !title ||
        viewCount === undefined ||
        likeCount === undefined ||
        commentCount === undefined ||
        !writer
    ) {
        return;
    }

    const formattedDate = formatRelativeDate(date);
    const safeWriter = escapeHtml(writer);
    const safeTitle = escapeHtml(title);
    const safeImgUrl = escapeHtml(String(imgUrl ?? '').trim());
    const hasProfileImage = safeImgUrl.length > 0;
    const initial = safeWriter.trim().charAt(0) || '?';
    const avatarMarkup = hasProfileImage
        ? `<div class="initialAvatar profileAvatar"><img src="${safeImgUrl}" alt="${safeWriter} 프로필 사진"></div>`
        : `<div class="initialAvatar" aria-hidden="true">${initial}</div>`;

    return `
    <a href="/html/board.html?id=${postId}" class="boardItemLink">
        <div class="boardItem">
            ${avatarMarkup}
            <div class="boardItemBody">
                <h2 class="title">${safeTitle}</h2>
                <p class="meta">${safeWriter} · ${formattedDate}</p>
                <div class="metrics" aria-label="이야기 반응">
                    <span class="metric likeMetric">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 21s-7-4.4-9.2-8.3C1 9.4 2.8 5.5 6.4 5.1c2-.2 3.5.8 4.3 2.1.3.5 1 .5 1.3 0 .8-1.3 2.3-2.3 4.3-2.1 3.6.4 5.4 4.3 3.6 7.6C19 16.6 12 21 12 21z" />
                        </svg>
                        <b>${likeCount}</b>
                    </span>
                    <span class="metric">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 5h14v10H8.7L5 18.2V5zm2 2v6.8l1-.8h9V7H7z" />
                        </svg>
                        <b>${commentCount}</b>
                    </span>
                    <span class="metric">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5c5 0 8.5 4.4 9.5 7-1 2.6-4.5 7-9.5 7s-8.5-4.4-9.5-7c1-2.6 4.5-7 9.5-7zm0 2c-3.5 0-6.2 2.8-7.2 5 1 2.2 3.7 5 7.2 5s6.2-2.8 7.2-5c-1-2.2-3.7-5-7.2-5zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
                        </svg>
                        <b>${viewCount}</b>
                    </span>
                </div>
            </div>
        </div>
    </a>
`;
};

export default BoardItem;
