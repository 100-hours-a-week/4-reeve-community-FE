import CommentItem from '../component/comment/comment.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
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

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const MAX_COMMENT_LENGTH = 1000;
const HTTP_NOT_AUTHORIZED = 401;
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

const getQueryString = name => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

const getBoardDetail = async postId => {
    const { ok, data } = await getPost(postId);
    if (!ok)
        return new Error('게시글 정보를 가져오는데 실패하였습니다.');
    return data;
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
    let isLiked = false;
    let isLikeLoading = false;
    let likeCount = Number(data.likeCount) || 0;

    likeCountElement.textContent = formatCount(likeCount);
    setLikeButtonState(likeButtonElement, isLiked);

    likeButtonElement.addEventListener('click', async () => {
        if (isLikeLoading) return;
        isLikeLoading = true;

        try {
            if (!isLiked) {
                const { status } = await likePost(
                    data.postId,
                );
                if (status === HTTP_CREATED) {
                    isLiked = true;
                    likeCount += 1;
                    setLikeButtonState(likeButtonElement, isLiked);
                    likeCountElement.textContent = formatCount(likeCount);
                } else if (status === HTTP_NOT_AUTHORIZED) {
                    window.location.href = '/html/login.html';
                } else {
                    Dialog('좋아요 실패', '좋아요 처리에 실패하였습니다.');
                }
            } else {
                const { status } = await unlikePost(
                    data.postId,
                );
                if (status === HTTP_NO_CONTENT) {
                    isLiked = false;
                    likeCount = Math.max(0, likeCount - 1);
                    setLikeButtonState(likeButtonElement, isLiked);
                    likeCountElement.textContent = formatCount(likeCount);
                } else if (status === HTTP_NOT_AUTHORIZED) {
                    window.location.href = '/html/login.html';
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
                    const { ok } = await deletePost(postId);
                    if (ok) {
                        window.location.href = '/';
                    } else {
                        Dialog('삭제 실패', '게시글 삭제에 실패하였습니다.');
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
                myInfo.userId,
                postId,
                event.commentId,
            );
            commentListElement.appendChild(item);
        });
    }
};

const addComment = async () => {
    const comment = document.querySelector('textarea').value;
    const pageId = getQueryString('id');

    const { ok } = await writeComment(pageId, comment);

    if (ok) {
        window.location.reload();
    } else {
        Dialog('댓글 등록 실패', '댓글 등록에 실패하였습니다.');
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
        const authState = await authCheck();
        if (!authState.ok) {
            throw new Error('사용자 정보를 불러오는데 실패하였습니다.');
        }

        const myInfoResult = await getUserInfo(authState.userId);
        const myInfo = myInfoResult.data;
        const commentBtnElement = document.querySelector('.commentInputBtn');
        const textareaElement = document.querySelector(
            '.commentInputWrap textarea',
        );
        textareaElement.addEventListener('input', inputComment);
        commentBtnElement.addEventListener('click', addComment);
        commentBtnElement.disabled = true;
        console.log(myInfo);
        const profileImage = resolveImageUrl(
            myInfo.profileImgUrl ?? myInfo.profileImageUrl,
            DEFAULT_PROFILE_IMAGE,
        );

        prependChild(document.body, Header('커뮤니티', 2, profileImage));

        const pageId = getQueryString('id');

        const pageData = await getBoardDetail(pageId);

        if (
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
