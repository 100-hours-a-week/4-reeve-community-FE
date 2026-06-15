import { changePassword } from '../api/modifyPasswordRequest.js';
import { getUserInfo } from '../api/modifyInfoRequest.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getServerUrl,
    prependChild,
    resolveImageUrl,
    validPassword,
} from '../utils/function.js';
import { handleApiError, requestJson } from '../utils/request.js';

const button = document.querySelector('#signupBtn');

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_NO_CONTENT = 204;

const authState = await authCheck();
if (!authState.ok) {
    throw new Error('Unauthorized');
}
const userId = authState.userId;
const userInfoResponse = await getUserInfo(userId);
const userInfo = userInfoResponse.data;
const profileImage = resolveImageUrl(
    userInfo.profileImgUrl ?? userInfo.profileImageUrl,
    DEFAULT_PROFILE_IMAGE,
);

const modifyData = {
    currentPassword: '',
    newPassword: '',
    passwordCheck: '',
};

const observeData = () => {
    const { currentPassword, newPassword, passwordCheck } = modifyData;

    // id, pw, pwck, nickname, profile 값이 모두 존재하는지 확인
    if (
        !currentPassword ||
        !newPassword ||
        !passwordCheck ||
        newPassword !== passwordCheck
    ) {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    } else {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    }
};

const ensureCurrentPasswordInput = () => {
    if (document.getElementById('currentPw')) return;

    const passwordInput = document.getElementById('pw');
    const passwordBox = passwordInput && passwordInput.closest('.inputBox');
    if (!passwordBox) return;

    const currentPasswordBox = document.createElement('div');
    currentPasswordBox.className = 'inputBox';
    currentPasswordBox.innerHTML = `
        <label for="currentPw">현재 비밀번호</label>
        <input
            type="password"
            name="currentPw"
            id="currentPw"
            placeholder="현재 비밀번호를 입력하세요"
        />
        <p class="helperText" name="currentPw"></p>
    `;

    passwordBox.parentNode.insertBefore(currentPasswordBox, passwordBox);
};

const blurEventHandler = async (event, uid) => {
    if (uid == 'currentPw') {
        const value = event.target.value;
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );

        if (!helperElement) return;

        if (value == '' || value == null) {
            helperElement.textContent = '*현재 비밀번호를 입력해주세요.';
            modifyData.currentPassword = '';
        } else {
            helperElement.textContent = '';
            modifyData.currentPassword = value;
        }
    } else if (uid == 'pw') {
        const value = event.target.value;
        const isValidPassword = validPassword(value);
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        const helperElementCheck = document.querySelector(
            `.inputBox p[name="pwck"]`,
        );

        if (!helperElement) return;

        if (value == '' || value == null) {
            helperElement.textContent = '*비밀번호를 입력해주세요.';
            helperElementCheck.textContent = '';
        } else if (!isValidPassword) {
            helperElement.textContent =
                '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
            helperElementCheck.textContent = '';
            modifyData.newPassword = '';
        } else {
            helperElement.textContent = '';
            modifyData.newPassword = value;
        }
    } else if (uid == 'pwck') {
        const value = event.target.value;
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        // pw 입력란의 현재 값
        const password = modifyData.newPassword;

        if (value == '' || value == null) {
            helperElement.textContent = '*비밀번호 한번 더 입력해주세요.';
        } else if (password !== value) {
            helperElement.textContent = '*비밀번호가 다릅니다.';
        } else {
            helperElement.textContent = '';
            modifyData.passwordCheck = value;
        }
    }

    observeData();
};

const addEventForInputElements = () => {
    const InputElement = document.querySelectorAll('input');
    InputElement.forEach(element => {
        const id = element.id;

        element.addEventListener('input', event => blurEventHandler(event, id));
    });
};

const modifyPassword = async () => {
    const { currentPassword, newPassword } = modifyData;

    const { ok, status, body } = await changePassword(
        userId,
        currentPassword,
        newPassword,
    );

    if (!ok) {
        handleApiError(status, body);
        return;
    }

    if (status == HTTP_NO_CONTENT) {
        try {
            await requestJson(`${getServerUrl()}/auth`, {
                method: 'DELETE',
                credentials: 'include',
            });
        } catch (error) {
            console.error('로그아웃 요청 실패:', error);
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        location.href = '/html/login.html';
    } else {
        handleApiError(status, body);
    }
};

const init = () => {
    ensureCurrentPasswordInput();
    button.addEventListener('click', modifyPassword);
    prependChild(document.body, Header('커뮤니티', 1, profileImage));
    addEventForInputElements();
    observeData();
};

init();
