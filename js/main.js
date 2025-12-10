//==================================
//  Firebase初期設定 / ログイン設定
//==================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    set,
    onChildAdded,
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";

// ★ここは自分の設定に置き換え（databaseURLはそのままでOK）
const firebaseConfig = {
    
};

// 初期化
const app = initializeApp(firebaseConfig);

// Realtime DB（この先チャットで使う）
const db = getDatabase(app);
const dbRef = ref(db, "chat");

// Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ボタンを押したらログイン
$("#loginBtn").on("click", () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("ログイン成功:", user.uid, user.displayName);
        })
        .catch((error) => {
            console.error("ログイン失敗:", error);
        });
});

// ログイン状態の監視
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("ログイン中ユーザー:", user.uid, user.displayName);
    } else {
        console.log("未ログイン");
    }
});

//==================================
// 個人設定フォーム
//==================================
// 画像プレビュー処理
$(function () {
    $("#iconImage").on("change", function (e) {
        const file = e.target.files[0];
        const $preview = $("#iconPreview");

        if (!file) {
            // ファイル未選択 or 選択解除
            $preview.attr("src", "").hide();
            return;
        }

        // 画像以外だったら弾く（任意）
        if (!file.type.startsWith("image/")) {
            alert("画像ファイルを選択してください");
            $(this).val("");          // input の中身をリセット
            $preview.attr("src", "").hide();
            return;
        }

        // FileReader で読み込んで表示
        const reader = new FileReader();
        reader.onload = function (event) {
            $preview.attr("src", event.target.result).show();
        };
        reader.readAsDataURL(file);
    });
});
