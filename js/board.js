import CommentItem from '../component/comment/comment.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    prependChild,
    padTo2Digits,
    resolveImageUrl,
} from '../utils/function.js';
import { getUserInfo } from '../api/modifyInfoRequest.js';
import {
    getPost,
    deletePost,
    writeComment,
    likePost,
    unlikePost,
} from '../api/boardRequest.js';
import { handleApiError } from '../utils/request.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const MAX_COMMENT_LENGTH = 1000;
const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;

const formatCount = value => {
    const count = Number(value);
    if (!Number.isFinite(count)) return value ?? '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
};

const setLikeButtonState = (button, isLiked) => {
    button.classList.toggle('is-active', isLiked);
    button.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
};

const isLoggedIn = () => !!localStorage.getItem('accessToken');

const showLoginRequiredDialog = () => {
    Dialog('로그인이 필요합니다', '로그인 후 이용해주세요.', () => {
        window.location.href = '/html/login.html';
    });
};

const getQueryString = name => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

const getBoardDetail = async postId => {
    const { ok, status, data, body } = await getPost(postId);
    if (!ok) {
        handleApiError(status, body);
        return null;
    }
    return data;
};

const getCurrentUserInfo = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    if (!accessToken || !userId) return null;

    try {
        const myInfoResult = await getUserInfo(userId);
        return myInfoResult.data;
    } catch (error) {
        console.error('사용자 정보를 불러오는데 실패하였습니다.', error);
        return null;
    }
};

const setBoardDetail = data => {
    // 헤드 정보
    const titleElement = document.querySelector('.title');
    const createdAtElement = document.querySelector('.createdAt');
    const imgElement = document.querySelector('.img');
    const nicknameElement = document.querySelector('.nickname');

    titleElement.textContent = data.title;
    const date = new Date(data.createdAt);
    const formattedDate = `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`;
    createdAtElement.textContent = formattedDate;

    imgElement.src = resolveImageUrl(
        data.writer ? data.writer.profileImgUrl : null,
        DEFAULT_PROFILE_IMAGE,
    );

    nicknameElement.textContent = data.writer ? data.writer.nickname : '';

    // 바디 정보
    const contentImgElement = document.querySelector('.contentImg');
    const fileUrl = resolveImageUrl(data.imageUrl);
    if (fileUrl) {
        console.log(fileUrl);
        const img = document.createElement('img');
        img.src = fileUrl;
        contentImgElement.appendChild(img);
    }
    const contentElement = document.querySelector('.content');
    contentElement.textContent = data.content;

    const likeButtonElement = document.querySelector('.likeButton');
    const likeCountElement = likeButtonElement.querySelector('h3');
    let isLiked = data.isLiked ?? false;
    let isLikeLoading = false;
    let likeCount = Number(data.likeCount) || 0;

    likeCountElement.textContent = formatCount(likeCount);
    setLikeButtonState(likeButtonElement, isLiked);

    likeButtonElement.addEventListener('click', async () => {
        if (!isLoggedIn()) {
            showLoginRequiredDialog();
            return;
        }
        if (isLikeLoading) return;
        isLikeLoading = true;

        try {
            if (!isLiked) {
                const { ok, status, body } = await likePost(
                    data.postId,
                );
                if (status === HTTP_CREATED) {
                    isLiked = true;
                    likeCount += 1;
                    setLikeButtonState(likeButtonElement, isLiked);
                    likeCountElement.textContent = formatCount(likeCount);
                } else if (!ok) {
                    handleApiError(status, body);
                } else {
                    Dialog('좋아요 실패', '좋아요 처리에 실패하였습니다.');
                }
            } else {
                const { ok, status, body } = await unlikePost(
                    data.postId,
                );
                if (status === HTTP_NO_CONTENT) {
                    isLiked = false;
                    likeCount = Math.max(0, likeCount - 1);
                    setLikeButtonState(likeButtonElement, isLiked);
                    likeCountElement.textContent = formatCount(likeCount);
                } else if (!ok) {
                    handleApiError(status, body);
                } else {
                    Dialog('좋아요 취소 실패', '좋아요 취소에 실패하였습니다.');
                }
            }
        } finally {
            isLikeLoading = false;
        }
    });

    const viewCountElement = document.querySelector('.viewCount h3');
    viewCountElement.textContent = formatCount(data.viewCount);

    const commentCountElement = document.querySelector('.commentCount h3');
    const commentCount = Array.isArray(data.comments) ? data.comments.length : 0;
    commentCountElement.textContent = commentCount.toLocaleString();
};

const setBoardModify = async (data, myInfo) => {
    if (parseInt(myInfo.userId, 10) === parseInt(data.writer.userId, 10)) {
        const modifyElement = document.querySelector('.hidden');
        modifyElement.classList.remove('hidden');

        const modifyBtnElement = document.querySelector('#deleteBtn');
        const postId = getQueryString('id');
        modifyBtnElement.addEventListener('click', () => {
            Dialog(
                '게시글을 삭제하시겠습니까?',
                '삭제한 내용은 복구 할 수 없습니다.',
                async () => {
                    const { ok, status, body } = await deletePost(postId);
                    if (ok) {
                        window.location.href = '/';
                    } else {
                        handleApiError(status, body);
                    }
                },
            );
        });

        const modifyBtnElement2 = document.querySelector('#modifyBtn');
        modifyBtnElement2.addEventListener('click', () => {
            window.location.href = `/html/board-modify.html?postId=${data.postId}`;
        });
    }
};

const setBoardComment = (data, myInfo, postId) => {
    const commentListElement = document.querySelector('.commentList');
    if (commentListElement) {
        data.map(event => {
            const comment = {
                ...event,
                author: event.writer,
                id: event.commentId,
            };
            const item = CommentItem(
                comment,
                myInfo ? myInfo.userId : null,
                postId,
                event.commentId,
            );
            commentListElement.appendChild(item);
        });
    }
};

const addComment = async () => {
    if (!isLoggedIn()) {
        showLoginRequiredDialog();
        return;
    }

    const comment = document.querySelector('textarea').value;
    const pageId = getQueryString('id');

    const { ok, status, body } = await writeComment(pageId, comment);

    if (ok) {
        window.location.reload();
    } else {
        handleApiError(status, body);
    }
};

const inputComment = async () => {
    const textareaElement = document.querySelector(
        '.commentInputWrap textarea',
    );
    const commentBtnElement = document.querySelector('.commentInputBtn');

    if (textareaElement.value.length > MAX_COMMENT_LENGTH) {
        textareaElement.value = textareaElement.value.substring(
            0,
            MAX_COMMENT_LENGTH,
        );
    }
    if (textareaElement.value === '') {
        commentBtnElement.disabled = true;
        commentBtnElement.style.backgroundColor = '#ACA0EB';
    } else {
        commentBtnElement.disabled = false;
        commentBtnElement.style.backgroundColor = '#7F6AEE';
    }
};

const init = async () => {
    try {
        const myInfo = await getCurrentUserInfo();
        const commentBtnElement = document.querySelector('.commentInputBtn');
        const textareaElement = document.querySelector(
            '.commentInputWrap textarea',
        );
        textareaElement.addEventListener('input', inputComment);
        commentBtnElement.addEventListener('click', addComment);
        commentBtnElement.disabled = true;
        const profileImage = myInfo
            ? resolveImageUrl(
                  myInfo.profileImgUrl ?? myInfo.profileImageUrl,
                  DEFAULT_PROFILE_IMAGE,
              )
            : null;

        prependChild(document.body, Header('커뮤니티', 2, profileImage, !myInfo));

        const pageId = getQueryString('id');

        const pageData = await getBoardDetail(pageId);
        if (!pageData) return;

        if (
            myInfo &&
            pageData.writer &&
            parseInt(pageData.writer.userId, 10) === parseInt(myInfo.userId, 10)
        ) {
            setBoardModify(pageData, myInfo);
        }
        setBoardDetail(pageData);

        setBoardComment(pageData.comments || [], myInfo, pageId);
    } catch (error) {
        console.error(error);
    }
};

init();
