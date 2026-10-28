/**
 * Wedding Wishes Core JS - LS-Wedding
 * Tự động đồng bộ gửi và hiển thị lời chúc cho toàn bộ các mẫu thiệp cưới.
 */
(function (window, document) {
    'use strict';

    function escapeHtml(text) {
        if (!text) return '';
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    var WeddingWishes = {
        cardId: null,
        endpoints: {
            list: function (id) { return '/wedding-cards/' + encodeURIComponent(id) + '/wishes'; },
            store: function (id) { return '/wedding-cards/' + encodeURIComponent(id) + '/wishes'; }
        },

        init: function (cardId, opts) {
            this.cardId = cardId;
            this.options = Object.assign({
                formSelector: '#messageForm, #customForm, .form-wedding-wish',
                listSelector: '.list_message, #list_message, .wish-list-container',
                statusSelector: '#status, .wish-status-msg',
                theme: 'default'
            }, opts || {});

            if (!this.cardId) return;

            this.loadWishes();
            this.bindForm();
        },

        loadWishes: function () {
            var self = this;
            var listEl = document.querySelector(self.options.listSelector);
            if (!listEl) return;

            fetch(self.endpoints.list(self.cardId), {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            })
            .then(function (res) { return res.json(); })
            .then(function (res) {
                if (res && res.success && Array.isArray(res.data)) {
                    if (res.data.length > 0) {
                        var html = '';
                        res.data.forEach(function (item) {
                            html += self.renderWishItem(item);
                        });
                        listEl.innerHTML = html;
                    } else {
                        listEl.innerHTML = '<div class="text-center italic opacity-75 py-3 text-sm">Chưa có lời chúc nào. Hãy là người đầu tiên gửi lời chúc nhé!</div>';
                    }
                }
            })
            .catch(function (err) {
                console.warn('[WeddingWishes] Không thể tải danh sách lời chúc:', err);
            });
        },

        renderWishItem: function (item) {
            var name = escapeHtml(item.sender_name || 'Khách mời');
            var msg = escapeHtml(item.message || '');
            var time = escapeHtml(item.created_at || 'Vừa xong');

            return '<div class="message-item uk-margin-small-bottom uk-padding-small uk-border-rounded blur-bg" style="border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); margin-bottom: 12px; border-radius: 12px; padding: 12px 16px;">' +
                   '  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">' +
                   '    <h4 class="user_message" style="margin: 0; font-weight: 700; font-size: 15px; color: inherit;">' + name + '</h4>' +
                   '    <span style="font-size: 11px; opacity: 0.75;">' + time + '</span>' +
                   '  </div>' +
                   '  <p class="message_body" style="margin: 0; font-size: 14px; line-height: 1.5; color: inherit; opacity: 0.95; white-space: pre-wrap;">' + msg + '</p>' +
                   '</div>';
        },

        bindForm: function () {
            var self = this;
            var forms = document.querySelectorAll(self.options.formSelector);
            if (!forms || forms.length === 0) return;

            forms.forEach(function (form) {
                form.addEventListener('submit', function (e) {
                e.preventDefault();

                // Lấy dữ liệu tên
                var nameInput = form.querySelector('#name, #m_name, #f_name, #rsvp-name, input[name="sender_name"], input[type="text"]');
                var nameVal = nameInput ? nameInput.value.trim() : '';

                // Lấy dữ liệu lời chúc
                var msgInput = form.querySelector('#messages, #m_text, #f_mess, textarea[name="message"], #rsvp-message, textarea');
                var msgVal = msgInput ? msgInput.value.trim() : '';

                // Lấy dữ liệu tham dự nếu có
                var attendInput = form.querySelector('#accept, #f_xn, #rsvp-status, select[name="attendance_status"], select#wedding-select');
                var attendVal = 'unsure';
                if (attendInput) {
                    var rawAttend = (attendInput.value || '').toLowerCase();
                    if (rawAttend === 'yes' || rawAttend.indexOf('có') !== -1 || rawAttend.indexOf('sẽ') !== -1 || rawAttend.indexOf('attending') !== -1 || rawAttend.indexOf('tham gia') !== -1) {
                        attendVal = 'attending';
                    } else if (rawAttend === 'no' || rawAttend.indexOf('không') !== -1 || rawAttend.indexOf('tiếc') !== -1 || rawAttend.indexOf('bận') !== -1) {
                        attendVal = 'not_attending';
                    }
                }

                // Lấy số người nếu có
                var guestRadio = form.querySelector('input[type="radio"]:checked, select[name="guest_count"], #rsvp-guests');
                var guestCount = 1;
                if (guestRadio && guestRadio.value) {
                    var parsed = parseInt(guestRadio.value, 10);
                    if (!isNaN(parsed) && parsed > 0) guestCount = parsed;
                }

                if (!nameVal) {
                    alert('Vui lòng nhập tên của bạn.');
                    if (nameInput) nameInput.focus();
                    return;
                }

                if (!msgVal) {
                    alert('Vui lòng nhập lời chúc.');
                    if (msgInput) msgInput.focus();
                    return;
                }

                // Nút submit & trạng thái
                var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                var origBtnText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Đang gửi lời chúc...';
                }

                var statusEl = document.querySelector(self.options.statusSelector);
                if (statusEl) {
                    statusEl.textContent = 'Đang gửi lời chúc...';
                    statusEl.style.display = 'block';
                }

                var payload = {
                    sender_name: nameVal,
                    message: msgVal,
                    attendance_status: attendVal,
                    guest_count: guestCount
                };

                fetch(self.endpoints.store(self.cardId), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                .then(function (res) { return res.json(); })
                .then(function (res) {
                    if (res && res.success) {
                        if (statusEl) {
                            statusEl.textContent = 'Gửi lời chúc thành công! Cảm ơn bạn rất nhiều.';
                            statusEl.style.color = '#10b981';
                        } else {
                            alert('Gửi lời chúc thành công! Cảm ơn bạn rất nhiều.');
                        }

                        // Prepend vào danh sách lời chúc
                        var listEl = document.querySelector(self.options.listSelector);
                        if (listEl) {
                            var newItemHtml = self.renderWishItem(res.data);
                            // Xóa thông báo rỗng nếu có
                            if (listEl.textContent.indexOf('Chưa có lời chúc nào') !== -1) {
                                listEl.innerHTML = '';
                            }
                            listEl.insertAdjacentHTML('afterbegin', newItemHtml);
                        }

                        // Reset form
                        form.reset();

                        // Nếu là modal UIKit thì tự đóng sau 1.5s
                        var modalParent = form.closest('.uk-modal');
                        if (modalParent && window.UIkit && window.UIkit.modal) {
                            setTimeout(function () {
                                window.UIkit.modal(modalParent).hide();
                            }, 1500);
                        }
                    } else {
                        var errMsg = (res && res.message) ? res.message : 'Có lỗi xảy ra khi gửi lời chúc.';
                        if (statusEl) {
                            statusEl.textContent = errMsg;
                            statusEl.style.color = '#ef4444';
                        } else {
                            alert(errMsg);
                        }
                    }
                })
                .catch(function (err) {
                    console.error('[WeddingWishes] Error:', err);
                    if (statusEl) {
                        statusEl.textContent = 'Lỗi kết nối mạng, vui lòng thử lại.';
                        statusEl.style.color = '#ef4444';
                    } else {
                        alert('Lỗi kết nối mạng, vui lòng thử lại.');
                    }
                })
                .finally(function () {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = origBtnText;
                    }
                });
            });
        },
    };

    window.WeddingWishes = WeddingWishes;
})(window, document);
