// api.js — Cliente da API da comunidade HexTatics

class HexTaticsAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.deviceId = this._getDeviceId();
    }

    _getDeviceId() {
        let id = localStorage.getItem("hextatics_device_id");
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("hextatics_device_id", id);
        }
        return id;
    }

    async _fetch(path, options = {}) {
        const url = `${this.baseUrl}/v1${path}`;
        const headers = {
            "Content-Type": "application/json",
            "X-Device-ID": this.deviceId,
            ...(options.headers || {}),
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        let json = null;
        try {
            json = await response.json();
        } catch {
            json = { success: false, error: "Resposta inválida da API" };
        }

        if (!response.ok || json.success === false) {
            throw new Error(json.error || `HTTP ${response.status}`);
        }

        return json;
    }

    publishMap(levelData, authorName = "Anônimo", title = "Mapa sem título") {
        return this._fetch("/maps", {
            method: "POST",
            body: JSON.stringify({
                title,
                author_name: authorName,
                level_json: levelData,
            }),
        });
    }

    getMaps(tab = "recent", cursor = null, limit = 20) {
        const params = new URLSearchParams();
        params.set("tab", tab);
        params.set("limit", String(limit));
        if (cursor) params.set("cursor", cursor);
        return this._fetch(`/maps?${params.toString()}`);
    }

    getMap(idOrSlug) {
        return this._fetch(`/maps/${encodeURIComponent(idOrSlug)}`);
    }

    likeMap(mapId) {
        return this._fetch(`/maps/${encodeURIComponent(mapId)}/like`, {
            method: "POST",
        });
    }

    reportMap(mapId, reason, detail = "") {
        return this._fetch(`/maps/${encodeURIComponent(mapId)}/report`, {
            method: "POST",
            body: JSON.stringify({ reason, detail }),
        });
    }

    startRun(mapId) {
        return this._fetch(`/maps/${encodeURIComponent(mapId)}/run-start`, {
            method: "POST",
        });
    }

    completeRun(mapId, runId, moves, timeSeconds, won) {
        return this._fetch(`/maps/${encodeURIComponent(mapId)}/run-complete`, {
            method: "POST",
            body: JSON.stringify({
                run_id: runId,
                moves,
                time_seconds: timeSeconds,
                won,
            }),
        });
    }

    async checkLiked(mapId) {
        const response = await this._fetch(`/maps/${encodeURIComponent(mapId)}`);
        return !!response?.data?.liked_by_me;
    }

    getMyPublishedMaps(cursor = null, limit = 20) {
        const params = new URLSearchParams();
        params.set("tab", "mine");
        params.set("limit", String(limit));
        if (cursor) params.set("cursor", cursor);
        return this._fetch(`/maps?${params.toString()}`);
    }
}

window.HexTaticsAPI = HexTaticsAPI;
