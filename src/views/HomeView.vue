<template>
  <div class="home">
    <NotesList />
  </div>
</template>

<script>
// @ is an alias to /src
import NotesList from '@/components/NotesList.vue'

export default {
  name: 'HomeView',
  components: {
    NotesList
  }
}
</script>

<style scoped>
.home {
  padding: 20px;
}
</style>
