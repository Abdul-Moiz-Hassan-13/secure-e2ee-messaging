import FormData from "form-data";
import fs from "fs";
import axios from "axios";

async function upload() {
  const form = new FormData();

  form.append("file", fs.createReadStream("C:/Users/abdul/test.enc"));
  form.append("senderId", "69278ef81f0f4f23dcf6f756");
  form.append("receiverId", "692791bd0e7612ca4481d217");
  form.append("filename", "test.enc");
  form.append("iv", "abcd");
  form.append("nonce", "testnonce");
  form.append("sequenceNumber", "1");

  const res = await axios.post("http://localhost:4000/api/files/upload", form, {
    headers: form.getHeaders(),
  });

  console.log(res.data);
}

upload();
