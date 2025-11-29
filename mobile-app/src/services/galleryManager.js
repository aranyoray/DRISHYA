import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '../constants/config';

const GALLERY_STORAGE_KEY = '@drishya_gallery';
const ALBUM_NAME = 'DRISHYA Moments';

class GalleryManagerService {
  constructor() {
    this.permissionGranted = false;
    this.album = null;
  }

  async initialize() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      this.permissionGranted = status === 'granted';

      if (this.permissionGranted) {
        await this.createAlbum();
      }

      return this.permissionGranted;
    } catch (error) {
      console.error('[GalleryManager] Init error:', error.message);
      return false;
    }
  }

  async createAlbum() {
    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      const existingAlbum = albums.find(a => a.title === ALBUM_NAME);

      if (existingAlbum) {
        this.album = existingAlbum;
      }

      return true;
    } catch (error) {
      console.error('[GalleryManager] Album creation error:', error.message);
      return false;
    }
  }

  async analyzeSceneInterest(imageBase64) {
    try {
      const prompt = 'Rate this scene on a scale of 1-10 for visual interest and beauty. Consider composition, lighting, colors, and subject matter. Return JSON: {"score": 1-10, "reason": "brief explanation", "categories": ["nature", "architecture", etc.]}';

      const response = await axios.post(
        API_CONFIG.OPENAI_API_URL,
        {
          model: API_CONFIG.OPENAI_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }],
          max_tokens: 150,
          temperature: 0.5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`
          },
          timeout: 10000
        }
      );

      return this.parseInterestResponse(response.data.choices[0].message.content);

    } catch (error) {
      console.error('[GalleryManager] Analysis error:', error.message);
      return null;
    }
  }

  parseInterestResponse(rawResponse) {
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const data = JSON.parse(jsonMatch[0]);
      return {
        score: data.score || 0,
        reason: data.reason || '',
        categories: data.categories || []
      };

    } catch (error) {
      console.error('[GalleryManager] Parse error:', error.message);
      return null;
    }
  }

  async saveImage(imageUri, metadata = {}) {
    if (!this.permissionGranted) {
      throw new Error('Gallery permission not granted');
    }

    try {
      const asset = await MediaLibrary.createAssetAsync(imageUri);

      if (this.album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], this.album, false);
      } else {
        this.album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, false);
      }

      await this.saveMetadata(asset.id, metadata);

      return {
        success: true,
        assetId: asset.id,
        uri: asset.uri
      };

    } catch (error) {
      console.error('[GalleryManager] Save error:', error.message);
      throw new Error('Failed to save image');
    }
  }

  async autoSaveIfInteresting(imageUri, imageBase64, threshold = 7) {
    try {
      const analysis = await this.analyzeSceneInterest(imageBase64);

      if (!analysis || analysis.score < threshold) {
        return {
          saved: false,
          score: analysis ? analysis.score : 0
        };
      }

      const result = await this.saveImage(imageUri, {
        score: analysis.score,
        reason: analysis.reason,
        categories: analysis.categories,
        autoSaved: true,
        timestamp: Date.now()
      });

      return {
        saved: true,
        score: analysis.score,
        ...result
      };

    } catch (error) {
      console.error('[GalleryManager] Auto-save error:', error.message);
      return {
        saved: false,
        error: error.message
      };
    }
  }

  async saveMetadata(assetId, metadata) {
    try {
      const key = `${GALLERY_STORAGE_KEY}_${assetId}`;
      await AsyncStorage.setItem(key, JSON.stringify(metadata));
    } catch (error) {
      console.error('[GalleryManager] Metadata save error:', error.message);
    }
  }

  async getMetadata(assetId) {
    try {
      const key = `${GALLERY_STORAGE_KEY}_${assetId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[GalleryManager] Metadata get error:', error.message);
      return null;
    }
  }

  async getSavedImages() {
    if (!this.permissionGranted || !this.album) {
      return [];
    }

    try {
      const albumAssets = await MediaLibrary.getAssetsAsync({
        album: this.album,
        first: 100,
        sortBy: MediaLibrary.SortBy.creationTime
      });

      const imagesWithMetadata = await Promise.all(
        albumAssets.assets.map(async asset => {
          const metadata = await this.getMetadata(asset.id);
          return {
            ...asset,
            metadata
          };
        })
      );

      return imagesWithMetadata;

    } catch (error) {
      console.error('[GalleryManager] Get images error:', error.message);
      return [];
    }
  }

  async deleteImage(assetId) {
    try {
      await MediaLibrary.deleteAssetsAsync([assetId]);
      const key = `${GALLERY_STORAGE_KEY}_${assetId}`;
      await AsyncStorage.removeItem(key);

      return { success: true };
    } catch (error) {
      console.error('[GalleryManager] Delete error:', error.message);
      throw new Error('Failed to delete image');
    }
  }

  async getImagesByCategory(category) {
    const images = await this.getSavedImages();
    return images.filter(img =>
      img.metadata?.categories?.includes(category)
    );
  }

  async getHighScoreImages(minScore = 8) {
    const images = await this.getSavedImages();
    return images.filter(img =>
      img.metadata?.score >= minScore
    );
  }
}

export default new GalleryManagerService();
