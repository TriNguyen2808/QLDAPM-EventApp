let deleteMode = false;
let selectedUsers = [];

let allUsers = []; // lưu toàn bộ user để lọc/sắp xếp
let sortAsc = true; // mặc định ID tăng dần

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();

  document.getElementById("btnCreate").addEventListener("click", () => {
    window.location.href = "user-create.html";
  });

  document.getElementById("btnDelete").addEventListener("click", handleDeleteClick);

  document.getElementById("roleFilter").addEventListener("change", renderUsers);
  document.getElementById("btnSort").addEventListener("click", () => {
    sortAsc = !sortAsc;
    renderUsers();
  });
});

async function loadUsers() {
  try {
    const res = await fetch(`${apiBase}/users/`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      throw new Error(`Lỗi load user: ${res.status}`);
    }

    const data = await res.json();
    allUsers = Array.isArray(data) ? data : data.results;
    renderUsers();
  } catch (err) {
    console.error("Lỗi load user:", err);
  }
}

function renderUsers() {
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  // Lọc theo vai trò
  const roleFilter = document.getElementById("roleFilter").value;
  let filteredUsers = allUsers;
  if (roleFilter !== "all") {
    filteredUsers = allUsers.filter(u => String(u.role) === roleFilter);
  }

  // Sắp xếp theo ID
  filteredUsers.sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);

  // Đổi text nút sắp xếp
  document.getElementById("btnSort").textContent = sortAsc
    ? "Sắp xếp theo ID ↑"
    : "Sắp xếp theo ID ↓";

  // Render bảng
  filteredUsers.forEach((user, index) => {
    const tr = document.createElement("tr");

    // Cột checkbox
    const tdSelect = document.createElement("td");
    if (deleteMode) {
      let checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = user.id;
      checkbox.checked = selectedUsers.includes(user.id);
      checkbox.addEventListener("change", (e) => toggleUserSelection(e, user.id));
      tdSelect.appendChild(checkbox);
    }
    tr.appendChild(tdSelect);

    // Cột ID
    const tdId = document.createElement("td");
    tdId.textContent = user.id || (index + 1);
    tr.appendChild(tdId);

    // Cột Tên
    const tdName = document.createElement("td");
    tdName.textContent = `${user.first_name} ${user.last_name}`;
    tr.appendChild(tdName);

    // Cột Email
    const tdEmail = document.createElement("td");
    tdEmail.textContent = user.email;
    tr.appendChild(tdEmail);

    // Cột Vai trò
    const tdRole = document.createElement("td");
    const roleNames = {
      1: "Admin",
      2: "Organizer",
      3: "Attendee"
    };
    tdRole.textContent = roleNames[user.role] || "Unknown";
    tr.appendChild(tdRole);

    // Cột Hoạt động
    const tdActive = document.createElement("td");
    tdActive.textContent = user.is_active !== false ? "True" : "False";
    tr.appendChild(tdActive);

    // Click row để edit nếu không ở delete mode
    if (!deleteMode) {
      tr.addEventListener("click", () => {
        window.location.href = "user-update-delete.html?id=" + user.id;
      });
    }

    tbody.appendChild(tr);
  });
}

async function handleDeleteClick() {
  const btnDelete = document.getElementById("btnDelete");
  const message = document.getElementById("deleteMessage");

  if (!deleteMode) {
    // Bật chế độ xoá
    deleteMode = true;
    selectedUsers = []; // reset danh sách chọn
    btnDelete.textContent = "Xác nhận xóa";
    message.textContent = "Chọn người dùng cần xóa";
    loadUsers();
    return;
  }

  // Đang ở chế độ xác nhận xoá
  if (selectedUsers.length === 0) {
    resetDeleteMode();
    loadUsers();
    return;
  }

  const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa ${selectedUsers.length} người dùng không?`);
  if (!isConfirmed) return;

  message.textContent = `Đang xóa ${selectedUsers.length} người dùng...`;

  try {
    await Promise.all(
      selectedUsers.map(async (id) => {
        const res = await fetch(`${apiBase}/users/${id}/`, {
          method: "DELETE",
          headers: {
            "Authorization": "Bearer " + localStorage.getItem("access_token")
          }
        });
        token = localStorage.getItem("token"); 
        if (!res.ok) {
          throw new Error(` Xóa user ${id} thất bại (${res.status} )`);
        }
      })
    );

    alert(`Đã xóa ${selectedUsers.length} người dùng`);
    resetDeleteMode();
    loadUsers();
  } catch (err) {
    console.error("Lỗi khi xóa:", err);
    message.textContent = "Có lỗi khi xóa người dùng!";
  }
}

function toggleUserSelection(event, userId) {
  if (event.target.checked) {
    if (!selectedUsers.includes(userId)) {
      selectedUsers.push(userId);
    }
  } else {
    selectedUsers = selectedUsers.filter(id => id !== userId);
  }

  const message = document.getElementById("deleteMessage");
  if (selectedUsers.length > 0) {
    message.textContent = `Đã chọn ${selectedUsers.length} người dùng`;
  } else {
    message.textContent = "Chọn người dùng cần xóa";
  }
}

function resetDeleteMode() {
  deleteMode = false;
  selectedUsers = [];
  document.getElementById("btnDelete").textContent = "Xóa người dùng";
  document.getElementById("deleteMessage").textContent = "";
}
