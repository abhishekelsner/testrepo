import { create } from 'zustand';
import { get, post, del } from '../../api/service.js';
import { ENDPOINTS } from '../../api/endpoints.js';

export const useImageStore = create((set) => ({
  images: [],
  loading: false,
  uploading: false,
  error: null,

  fetchImages: async () => {
    set({ loading: true, error: null });
    try {
      const res = await get(ENDPOINTS.IMAGES);
      set({ images: res.data.images, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to load images', loading: false });
    }
  },

  uploadImage: async (file) => {
    set({ uploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await post(ENDPOINTS.IMAGE_UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((state) => ({
        images: [res.data.image, ...state.images],
        uploading: false,
      }));
      return res.data.image;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Upload failed', uploading: false });
      return null;
    }
  },

  deleteImage: async (id) => {
    try {
      await del(ENDPOINTS.IMAGE_BY_ID(id));
      set((state) => ({ images: state.images.filter((img) => img._id !== id) }));
    } catch (err) {
      set({ error: err.response?.data?.error || 'Delete failed' });
    }
  },
}));
