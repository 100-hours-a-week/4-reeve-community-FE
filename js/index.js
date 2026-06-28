import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts } from '../apiRequest/indexRequest.js';
import { getUserInfo } from '../apiRequest/modifyInfoRequest.js';
import { handleApiError } from '../utils/request.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const SCROLL_THRESHOLD = 0.9;
const INITIAL_OFFSET = 5;
const ITEMS_PER_LOAD = 5;
const DEFAULT_SORT = 'recent';
let currentKeyword = '';
let currentSort = DEFAULT_SORT;
let offset = 0;
let isEnd = false;
let isProcessing = false;

const updateSortVisibility = () => {
    const sortRow = document.querySelector('#searchSortRow');
    if (!sortRow) return;
    const isSearching = currentKeyword.trim().length > 0;
    sortRow.classList.toggle('isHidden', !isSearching);
    sortRow.setAttribute('aria-hidden', String(!isSearching));
};

// getBoardItem 함수
const getBoardItem = async (offsetValue = 0, limitValue = 5) => {
    const result = await getPosts(offsetValue, limitValue, currentKeyword);
    if (!result.ok) {
        handleApiError(result.status, result.body);
        return [];
    }
    return result.data && Array.isArray(result.data.content)
        ? result.data.content
        : result.data;
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

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;
    isProcessing = true;

    try {
        if (reset) {
            offset = 0;
            isEnd = false;
            resetBoardList();
        }
        const items = await getBoardItem(offset, ITEMS_PER_LOAD);
        if (!items || items.length === 0) {
            isEnd = true;
            return;
        }
        setBoardItem(items);
        offset += ITEMS_PER_LOAD;
    } catch (error) {
        console.error('Error fetching items:', error);
        isEnd = true;
    } finally {
        isProcessing = false;
    }
};

const addSearchEvent = () => {
    const searchInput = document.querySelector('#searchInput');
    const searchButton = document.querySelector('.searchButton');
    if (!searchInput || !searchButton) return;

    const runSearch = async () => {
        const trimmedKeyword = searchInput.value.trim();
        if (trimmedKeyword.length > 0 && trimmedKeyword.length < 2) {
            Dialog('검색 실패', '검색어는 2글자 이상 입력해주세요.');
            return;
        }
        currentKeyword = trimmedKeyword;
        updateSortVisibility();
        await loadBoardItems({ reset: true });
    };

    searchButton.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
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

const addSortEvent = () => {
    const sortSelect = document.querySelector('#searchSortSelect');
    if (!sortSelect) return;
    sortSelect.value = currentSort;

    sortSelect.addEventListener('change', async () => {
        currentSort = sortSelect.value || DEFAULT_SORT;
        if (currentKeyword.trim().length === 0) return;
        await loadBoardItems({ reset: true });
    });
};

// 스크롤 이벤트 추가
const addInfinityScrollEvent = () => {
    offset = INITIAL_OFFSET;
    isEnd = false;
    isProcessing = false;

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
            Header('Community', 0, profileImageUrl, !profileImageUrl),
        );

        updateSortVisibility();
        await loadBoardItems({ reset: true });

        addSearchEvent();
        addWriteEvent();
        addSortEvent();
        addInfinityScrollEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();
