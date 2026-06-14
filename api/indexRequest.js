import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = (offset, limit, keyword = '') => {
    const page = Math.floor(offset / limit);
    const query = new URLSearchParams({
        page,
        size: limit,
    });
    if (keyword.trim()) {
        query.set('keyword', keyword.trim());
    }

    const result = requestJson(
        `${getServerUrl()}/posts?${query.toString()}`,
        {
            skipAuth: true,
            credentials: 'include',
        },
    );
    return result;
};
