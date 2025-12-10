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
    get,                    // ★ 追加：DBから1回だけ取得するため
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";



// 🌟 ここは保存する時は消す！！！！！！！！！！
const firebaseConfig = {

};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app); //RealtimeDBに接続
const chatRef = ref(db, "chat"); //RealtimeDB内の"chat"を使う

// Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();


//==================================
// 画面表示を切り替える関数
//==================================
function showOnlyLogin() {
    $(".login").show();
    $(".personal_setting").hide();
    $(".chat-section").hide();
}

function showPersonalSetting() {
    $(".login").hide();
    $(".personal_setting").css("display", "flex");
    $(".chat-section").hide();
}

function showChatSection() {
    $(".login").hide();
    $(".personal_setting").hide();
    $(".chat-section").show();
}

//==================================
// 時間表示を切り替える関数
//==================================

function formatTime(timestamp) {
    if (!timestamp) return "";

    const d = new Date(timestamp);

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[d.getDay()];
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");

    return `${month}/${day}(${weekday}) ${h}:${m}`;
}



//==================================
// ページ読み込み後の処理
//==================================
$(function () {
    // 最初はログイン画面だけ
    showOnlyLogin();

    //--------------------------------
    // Googleログインボタン
    //--------------------------------
    $("#loginBtn").on("click", () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error("ログイン失敗:", error);
            alert("ログインに失敗しました");
        });
        // 成功時の画面切り替えは onAuthStateChanged 側でまとめて処理
    });

    //--------------------------------
    // 画像プレビュー処理
    //--------------------------------
    $("#iconImage").on("change", function (e) {
        const file = e.target.files[0];
        const $preview = $("#iconPreview");

        if (!file) {
            $preview.attr("src", "").hide();
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("画像ファイルを選択してください");
            $(this).val("");
            $preview.attr("src", "").hide();
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            $preview.attr("src", event.target.result).show();
        };
        reader.readAsDataURL(file);
    });

    //--------------------------------
    // 個人設定フォームの登録ボタン
    //--------------------------------
    $("#personalForm").on("submit", function (e) {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("ログインしていません");
            return;
        }

        const profile = {
            uid: user.uid,
            lastName: $("#lastName").val().trim(),
            firstName: $("#firstName").val().trim(),
            displayName: $("#displayName").val().trim(),
            // アイコンは本気でやるなら Storage にアップしてURL保存がベスト
            // ひとまず今回はテキスト情報だけ保存しておく
        };

        if (!profile.displayName) {
            alert("表示名を入力してください");
            return;
        }

        const userRef = ref(db, `users/${user.uid}`);

        set(userRef, profile)
            .then(() => {
                console.log("プロフィール保存完了");
                // 登録できたらチャット画面へ
                showChatSection();
            })
            .catch((err) => {
                console.error("プロフィール保存エラー:", err);
                alert("プロフィールの保存に失敗しました");
            });
    });
});

//==================================
// ログイン状態の監視
//==================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.log("未ログイン");
        showOnlyLogin();
        return;
    }

    console.log("ログイン中ユーザー:", user.uid, user.displayName);

    // ログインしたユーザーのプロフィールがすでに DB にあるかどうか確認
    const userRef = ref(db, `users/${user.uid}`);

    get(userRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                // すでに登録済み → チャット画面へ
                const profile = snapshot.val();
                console.log("既存プロフィール:", profile);

                // 画面の displayName 初期値に反映しておく（任意）
                $("#displayName").val(profile.displayName || "");
                $("#lastName").val(profile.lastName || "");
                $("#firstName").val(profile.firstName || "");

                showChatSection();
            } else {
                // 初回ログイン → 個人設定フォームへ
                showPersonalSetting();
            }
        })
        .catch((err) => {
            console.error("プロフィール取得エラー:", err);
            // 何かあったらとりあえずフォームへ飛ばす
            showPersonalSetting();
        });
});


//==================================
// チャット送信／受信処理
//==================================
$(function () {
    // 🔸 メッセージ送信
    $("#chatForm").on("submit", function (e) {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("ログインしてください");
            return;
        }

        // フォームに入力された表示名を使う
        const name = $("#displayName").val().trim()
        const text = $("#chatInput").val();

        if (!text) {
            return;
        }

        // 送信するメッセージオブジェクト
        const msg = {
            uid: user.uid,
            // icon:  あとで実装予定
            name: name,
            text: text,
            createdAt: Date.now(), // 並び確認用（必要に応じて）
        };

        // Realtime DB に push して保存
        const newPostRef = push(chatRef);
        set(newPostRef, msg)

        $("#chatInput").val("")
    });



    // 🔸 メッセージ受信（既存＋新規が全部ここに流れてくる）
    onChildAdded(chatRef, function (data) {
        const msg = data.val();
        const key = data.key;

        if (!msg) return;

        const currentUser = auth.currentUser;

        let isMe = false;
        if (currentUser && msg.uid === currentUser.uid) {
            isMe = true;
        }

        //自分のメッセージかどうかでクラスを分ける
        let messageClass = "";

        if (isMe === true) {
            messageClass = "chat-message chat-message--me";
        } else {
            messageClass = "chat-message chat-message--other";
        }

        //時間表示を整形
        let timeText = "";

        if (msg.createdAt) {
            timeText = formatTime(msg.createdAt);
        }

        const html = `
            <div class="${messageClass}">
                <div class="chat-message__inner">
                    <div class="chat-message__name">
                        ${msg.name}
                    </div>
                    <div class="chat-message">
                        <span class = "chat-message__text">
                            ${msg.text}
                        </span>
                        <span class="chat-message__time">
                            ${timeText}
                        </span>
                    </div>
                </div>
            </div>
        `;

        const $container = $("#chatMessages");
        $container.append(html);

        $container.scrollTop($container[0].scrollHeight);
    });
});
