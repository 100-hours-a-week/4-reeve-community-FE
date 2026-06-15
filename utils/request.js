/*
Step 1 확인:
- 리프레시 토큰 엔드포인트: POST /auth/refreshToken
- RT 전달 방식: AuthController @CookieValue("refreshToken"), httpOnly Cookie 자동 포함(credentials: 'include' 필요)
- 리프레시 성공 응답 JSON 구조: ResponseWrapper { message, data }, 새 AT 필드명은 data.accessToken
- SecurityConfig permitAll 여부: POST /auth/refreshToken permitAll()
*/

let isRefreshing = false;
let refreshSubscribers = [];

const REFRESH_ENDPOINT_PATH = '/auth/refreshToken';
const HTTP_UNAUTHORIZED = 401;

export const parseJsonSafe = async response => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const createRequestResult = async response => {
    const body = await parseJsonSafe(response);
    return {
        response,
        ok: response.ok,
        status: response.status,
        code: body && body.code ? body.code : null,
        data: body && Object.prototype.hasOwnProperty.call(body, 'data')
            ? body.data
            : null,
        body,
    };
};

const getRequestPath = url => {
    try {
        return new URL(url, window.location.origin).pathname;
    } catch (error) {
        return '';
    }
};

const getRefreshUrl = url => {
    return new URL(REFRESH_ENDPOINT_PATH, url).toString();
};

const retryRequestWithAccessToken = async (url, fetchOptions, accessToken) => {
    const response = await fetch(url, {
        ...fetchOptions,
        headers: {
            ...fetchOptions.headers,
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return createRequestResult(response);
};

export const requestJson = async (url, options = {}) => {
    const { skipAuth = false, ...fetchOptions } = options;
    const accessToken = skipAuth ? null : localStorage.getItem('accessToken');
    const headers = accessToken
        ? {
              ...fetchOptions.headers,
              Authorization: `Bearer ${accessToken}`,
          }
        : fetchOptions.headers;
    const response = await fetch(url, {
        ...fetchOptions,
        headers,
    });
    const result = await createRequestResult(response);

    if (result.status !== HTTP_UNAUTHORIZED) {
        return result;
    }

    if (getRequestPath(url) === REFRESH_ENDPOINT_PATH) {
        return result;
    }

    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            refreshSubscribers.push({
                resolve: newAccessToken => {
                    resolve(
                        retryRequestWithAccessToken(
                            url,
                            fetchOptions,
                            newAccessToken,
                        ),
                    );
                },
                reject,
            });
        });
    }

    isRefreshing = true;

    try {
        const refreshResponse = await fetch(getRefreshUrl(url), {
            method: 'POST',
            credentials: 'include',
        });
        const refreshResult = await createRequestResult(refreshResponse);
        const newAccessToken = refreshResult.data
            ? refreshResult.data.accessToken
            : null;

        if (!refreshResult.ok || !newAccessToken) {
            throw new Error('Token refresh failed');
        }

        localStorage.setItem('accessToken', newAccessToken);
        refreshSubscribers.forEach(subscriber =>
            subscriber.resolve(newAccessToken),
        );
        refreshSubscribers = [];
        isRefreshing = false;

        return retryRequestWithAccessToken(url, fetchOptions, newAccessToken);
    } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        refreshSubscribers.forEach(subscriber => subscriber.reject(error));
        refreshSubscribers = [];
        isRefreshing = false;
        window.location.href = '/html/login.html';
        return;
    }
};
