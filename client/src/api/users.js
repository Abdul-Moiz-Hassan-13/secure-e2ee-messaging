import axios from "./axiosClient";

export async function getAllUsers() {
  const res = await axios.get("/users");
  return res.data;
}

export async function getUserById(id) {
  const res = await axios.get(`/users/${id}`);
  return res.data;
}
