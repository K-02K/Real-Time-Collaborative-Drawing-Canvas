class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Set of users
  }

  addUser(roomId, user) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    this.rooms.get(roomId).set(user.id, user);
  }

  removeUser(roomId, userId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(userId);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getUsers(roomId) {
    if (!this.rooms.has(roomId)) {
      return [];
    }
    return Array.from(this.rooms.get(roomId).values());
  }

  getUser(roomId, userId) {
    if (!this.rooms.has(roomId)) {
      return null;
    }
    return this.rooms.get(roomId).get(userId) || null;
  }

  updateUserName(roomId, userId, newName) {
    if (!this.rooms.has(roomId)) {
      return false;
    }
    const user = this.rooms.get(roomId).get(userId);
    if (user) {
      user.name = newName.trim() || user.name;
      return true;
    }
    return false;
  }
}

module.exports = RoomManager;

