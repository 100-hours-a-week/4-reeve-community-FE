import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts } from '../apiRequest/indexRequest.js';
import { getUserInfo } from '../apiRequest/modifyInfoRequest.js';
import { handleApiError } from '../utils/request.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const SCROLL_THRESHOLD = 0.9;
const ITEMS_PER_LOAD = 9;
let offset = 0;
let isEnd = false;
let isProcessing = false;

// getBoardItem 함수
const getBoardPage = async (offsetValue = 0, limitValue = ITEMS_PER_LOAD) => {
    const result = await getPosts(offsetValue, limitValue);
    if (!result.ok) {
        handleApiError(result.status, result.body);
        return { content: [], last: true };
    }
    if (result.data && Array.isArray(result.data.content)) {
        return result.data;
    }
    return {
        content: Array.isArray(result.data) ? result.data : [],
        last: true,
    };
};

const setBoardItem = boardData => {
    const boardList = document.querySelector('.boardList');
    if (boardList && boardData) {
        const itemsHtml = boardData
            .map(data =>
                BoardItem(
                    data.postId,
                    data.createdAt,
                    data.title,
                    data.viewCount,
                    data.writer ? data.writer.profileImgUrl : null,
                    data.writer ? data.writer.nickname : null,
                    data.commentCount,
                    data.likeCount,
                ),
            )
            .join('');
        boardList.innerHTML += ` ${itemsHtml}`;
    }
};

const resetBoardList = () => {
    const boardList = document.querySelector('.boardList');
    if (boardList) {
        boardList.innerHTML = '';
    }
};

const updateLoadMoreButton = () => {
    const loadMoreWrap = document.querySelector('.loadMoreWrap');
    const loadMoreButton = document.querySelector('.loadMoreBtn');
    if (!loadMoreButton) return;

    if (loadMoreWrap) {
        loadMoreWrap.hidden = isEnd;
    }
    loadMoreButton.hidden = isEnd;
    loadMoreButton.disabled = isProcessing;
};

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;
    isProcessing = true;
    updateLoadMoreButton();

    try {
        if (reset) {
            offset = 0;
            isEnd = false;
            resetBoardList();
        }
        const page = await getBoardPage(offset, ITEMS_PER_LOAD);
        const items = page.content;
        if (!items || items.length === 0) {
            isEnd = true;
            return;
        }
        setBoardItem(items);
        offset += ITEMS_PER_LOAD;
        isEnd = Boolean(page.last);
    } catch (error) {
        console.error('Error fetching items:', error);
        isEnd = true;
    } finally {
        isProcessing = false;
        updateLoadMoreButton();
    }
};

const addLoadMoreEvent = () => {
    const loadMoreButton = document.querySelector('.loadMoreBtn');
    if (!loadMoreButton) return;

    loadMoreButton.addEventListener('click', () => {
        loadBoardItems();
    });
};

const showLoginRequiredDialog = () => {
    Dialog('로그인이 필요합니다', '로그인 후 이용해주세요.', () => {
        window.location.href = '/html/login.html';
    });
};

const addWriteEvent = () => {
    const writeLink = document.querySelector('#writeLink');
    if (!writeLink) return;

    writeLink.addEventListener('click', event => {
        if (localStorage.getItem('accessToken')) return;
        event.preventDefault();
        showLoginRequiredDialog();
    });
};

// 스크롤 이벤트 추가
const addInfinityScrollEvent = () => {
    window.addEventListener('scroll', async () => {
        const hasScrolledToThreshold =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight * SCROLL_THRESHOLD;
        if (hasScrolledToThreshold) {
            loadBoardItems();
        }
    });
};

const getHeaderProfileImage = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    if (!accessToken || !userId) return null;

    try {
        const userInfoResponse = await getUserInfo(userId);
        const data = userInfoResponse.data;
        return resolveImageUrl(
            data.profileImgUrl ?? data.profileImageUrl,
            DEFAULT_PROFILE_IMAGE,
        );
    } catch (error) {
        console.error('Failed to load user info:', error);
        return null;
    }
};

const init = async () => {
    try {
        const profileImageUrl = await getHeaderProfileImage();

        prependChild(
            document.body,
            Header('여행모퉁이', 0, profileImageUrl, !profileImageUrl),
        );

        await loadBoardItems({ reset: true });

        addWriteEvent();
        addLoadMoreEvent();
        addInfinityScrollEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();
