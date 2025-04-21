<template>
  <div class="notes-list">
    <h2>Your Notes</h2>
    <div v-if="loading" class="loading">Loading notes...</div>
    <div v-else-if="error" class="error">Error loading notes: {{ error }}</div>
    <div v-else class="notes-grid">
      <div v-for="note in notes" :key="note.name" class="note-item">
        <router-link :to="'/edit/' + note.name">
          {{ note.name }}
        </router-link>
      </div>
      <div class="note-item new-note">
        <router-link to="/new">
          + New Note
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { getFiles, getAuthenticatedUser } from '@/github.js';

export default {
  name: 'NotesList',
  data() {
    return {
      notes: [],
      owner: '',
      repo: '',
      loading: true,
      error: null
    };
  },
  async mounted() {
    try {
      this.repo = localStorage.getItem('github_repo');
      if (!this.repo || !localStorage.getItem('github_token')) {
        this.$router.push('/settings');
        return;
      }
      
      const user = await getAuthenticatedUser();
      this.owner = user.login;
      await this.loadNotes();
    } catch (error) {
      console.error('Error initializing notes list:', error);
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async loadNotes() {
      try {
        this.notes = await getFiles(this.owner, this.repo);
        console.log('Loaded notes:', this.notes); // Debug log
      } catch (error) {
        console.error('Error loading notes:', error);
        this.error = error.message;
      }
    }
  }
};
</script>

<style scoped>
.notes-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading, .error {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error {
  color: #d32f2f;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.note-item {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  transition: transform 0.2s;
}

.note-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.note-item a {
  text-decoration: none;
  color: #2c3e50;
  font-weight: 500;
}

.new-note {
  background: #e3f2fd;
}

.new-note a {
  color: #1976d2;
}
</style> 