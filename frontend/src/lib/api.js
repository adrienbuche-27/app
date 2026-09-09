import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const photoUrl = (path) => (path ? `${API}/photos/${path}` : null);

export const api = {
  listSummits: () => axios.get(`${API}/summits`).then((r) => r.data),
  createSummit: (payload) => axios.post(`${API}/summits`, payload).then((r) => r.data),
  updateSummit: (id, payload) => axios.put(`${API}/summits/${id}`, payload).then((r) => r.data),
  deleteSummit: (id) => axios.delete(`${API}/summits/${id}`).then((r) => r.data),
  refreshProfile: (id) => axios.post(`${API}/summits/${id}/refresh-profile`).then((r) => r.data),
  listFamousCols: () => axios.get(`${API}/famous-cols`).then((r) => r.data),
  missingCols: () => axios.get(`${API}/missing-cols`).then((r) => r.data),
  colAttempts: () => axios.get(`${API}/col-attempts`).then((r) => r.data),
  stats: () => axios.get(`${API}/stats`).then((r) => r.data),
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return axios
      .post(`${API}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
  parseGpx: (file, summitLat, summitLng) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("summit_lat", summitLat);
    fd.append("summit_lng", summitLng);
    return axios
      .post(`${API}/gpx/parse`, fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
};
