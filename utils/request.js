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
