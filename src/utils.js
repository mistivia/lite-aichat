export default {
    syncJsonFetch,
    noCacheSyncJsonFetch,
};

function syncJsonFetch(url) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);  // sync request
        xhr.send();

        if (xhr.status !== 200) {
            throw new Error(`HTTP Error: ${xhr.status}`);
        }

        const data = JSON.parse(xhr.responseText);
        return data;
    } catch (error) {
        console.error('Error fetching JSON:', error);
        throw error;
    }
}

function noCacheSyncJsonFetch(url) {
    const timestamp = new Date().getTime();
    return syncJsonFetch(url + '?t=' + timestamp);
}

