import { dialog, env, nt, utils } from "qqntim/renderer";
import { getPluginConfig } from "./config";
import { createRoot } from "react-dom/client";

function selectPeer() {
    return new Promise<Map<string, QQNTim.API.Renderer.NT.Peer> | undefined>((resolve) => {
        const currentSelected = document.querySelector<HTMLElement>(".recent-contact-item.recent-contact-item--selected");
        currentSelected?.classList.remove("list-item--selected", "recent-contact-item--selected");
        const selectedPeers = new Map<string, QQNTim.API.Renderer.NT.Peer>();
        const mouseDownHandler = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };
        const clickHandler = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const element = (event.target as HTMLElement | undefined)?.closest?.<HTMLElement>(".recent-contact-item");
            const itemData = element?.__VUE__?.[0]?.props?.itemData;
            if (itemData)
                if (!selectedPeers.has(itemData.uid)) {
                    selectedPeers.set(itemData.uid, { chatType: itemData.type == 1 ? "friend" : itemData.type == 2 ? "group" : "others", uid: itemData.uid });
                    element?.classList.add("list-item--selected", "recent-contact-item--selected");
                } else {
                    selectedPeers.delete(itemData.uid);
                    element?.classList.remove("list-item--selected", "recent-contact-item--selected");
                }
        };
        const elements = document.querySelectorAll<HTMLElement>(".recent-contact-item");
        for (const element of elements) {
            (element?.firstElementChild as HTMLElement | null)?.addEventListener("mousedown", mouseDownHandler);
            (element?.firstElementChild as HTMLElement | null)?.addEventListener("click", clickHandler);
        }
        const exitSelect = () => {
            for (const element of elements) {
                (element?.firstElementChild as HTMLElement | null)?.removeEventListener("mousedown", mouseDownHandler);
                (element?.firstElementChild as HTMLElement | null)?.removeEventListener("click", clickHandler);
                element.classList.remove("list-item--selected", "recent-contact-item--selected");
            }
            currentSelected?.classList.add("list-item--selected", "recent-contact-item--selected");
            okBtn.remove();
            cancelBtn.remove();
        };
        const okBtn = document.createElement("button");
        okBtn.classList.add("q-button", "q-button--default", "q-button--primary", "enhanced-messaging-floating-ok");
        const okBtnText = document.createElement("span");
        okBtnText.classList.add("q-button__slot-warp");
        okBtnText.innerText = "确定";
        okBtn.appendChild(okBtnText);
        okBtn.addEventListener("click", () => {
            exitSelect();
            resolve(selectedPeers);
        });
        const cancelBtn = document.createElement("button");
        cancelBtn.classList.add("q-button", "q-button--default", "q-button--secondary", "enhanced-messaging-floating-cancel");
        const cancelBtnText = document.createElement("span");
        cancelBtnText.classList.add("q-button__slot-warp");
        cancelBtnText.innerText = "取消";
        cancelBtn.appendChild(cancelBtnText);
        cancelBtn.addEventListener("click", () => {
            exitSelect();
            resolve(undefined);
        });
        document.body.appendChild(okBtn);
        document.body.appendChild(cancelBtn);
    });
}

function encodeMsg(msg: any) {
    return msg.elements.map((_element) => {
        const element = JSON.parse(JSON.stringify(_element));
        return {
            type: "raw",
            raw: {
                ...element,
                elementId: "",
                extBufForUI: undefined,
                picElement: element.picElement && {
                    ...element.picElement,
                    fileSubId: undefined,
                    fileUuid: undefined,
                    progress: undefined,
                    thumbPath: undefined,
                    transferStatus: undefined,
                },
            },
        };
    });
}

function forwardMsg(msg: any) {
    selectPeer().then((peers) => {
        if (!peers) return;
        Promise.all(Array.from(peers.values()).map((peer) => nt.sendMessage(peer, encodeMsg(msg)).catch((reason) => console.error(reason))))
            .then((array) => array.filter(Boolean))
            .then((array) => {
                dialog.alert(`成功向 ${array.length} 个对象转发此消息。`);
            });
    });
}

function repeatMsg(msg: any) {
    nt.sendMessage({ uid: msg.peerUid, chatType: msg.chatType == 1 ? "friend" : msg.chatType == 2 ? "group" : "others" }, encodeMsg(msg));
}

function forceRevokeMsg(msg: any) {
    nt.revokeMessage({ uid: msg.peerUid, chatType: msg.chatType == 1 ? "friend" : msg.chatType == 2 ? "group" : "others" }, msg.msgId);
}

function ShareIcon() {
    return (
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V10H13V13H3L3 3H6V2Z" fill="currentColor" />
            <path d="M8 4.5H13V3.5H8V4.5ZM7.5 10V5H6.5V10H7.5ZM8 3.5C7.17157 3.5 6.5 4.17157 6.5 5H7.5C7.5 4.72386 7.72386 4.5 8 4.5V3.5Z" fill="currentColor" />
            <path d="M11.1213 1.87868L13.2426 4L11.1213 6.12132" stroke="currentColor" />
        </svg>
    );
}

function RevokeIcon() {
    return (
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5H9.5C11.7091 4.5 13.5 6.29086 13.5 8.5V8.5C13.5 10.7091 11.7091 12.5 9.5 12.5H3" stroke="currentColor" />
            <path d="M5.5 1.5L2.50004 4.49998L5.5 7.49997" stroke="currentColor" strokeLinejoin="round" />
        </svg>
    );
}

function Menu({ msg, showForwardBtn, showPlusOneBtn, showForceRevokeBtn, blur }: { msg: any; showForwardBtn: boolean; showPlusOneBtn: boolean; showForceRevokeBtn: boolean; blur: Function }) {
    return (
        <>
            {(showForwardBtn || showPlusOneBtn) && <div className="q-context-menu-separator" role="separator" />}
            {([showForwardBtn && ["转发", <ShareIcon />, () => forwardMsg(msg)], showForceRevokeBtn && ["强制撤回", <RevokeIcon />, () => forceRevokeMsg(msg)], showPlusOneBtn && ["+1", undefined, () => repeatMsg(msg)]].filter(Boolean) as [string, React.ReactNode, Function][]).map(
                ([title, icon, onClick], idx) => (
                    <a
                        // rome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                        key={idx}
                        className="q-context-menu-item q-context-menu-item--normal"
                        role="item"
                        onClick={() => {
                            onClick();
                            blur();
                        }}
                    >
                        <i className="q-icon q-context-menu-item__head" style={{ width: "16px", height: "16px", alignItems: "center", color: "inherit", display: "inline-flex", justifyContent: "center" }}>
                            {icon}
                        </i>
                        <span className="q-context-menu-item__text">{title}</span>
                    </a>
                ),
            )}
        </>
    );
}

export default class Entry implements QQNTim.Entry.Renderer {
    constructor() {
        const config = getPluginConfig(env.config.plugins.config);
    }

    onWindowLoaded(): void {
        const handler = (event: MouseEvent) => {
            const msg = (event.target as HTMLElement | undefined)?.closest(".msg-content-container")?.closest<HTMLElement>(".message")?.__VUE__?.[0]?.props?.msgRecord;
            let showForwardBtn = true;
            let showForceRevokeBtn = msg.chatType == 1;
            if (msg) {
                utils.waitForElement<HTMLElement>(".q-context-menu").then((menu) => {
                    const items = document.querySelectorAll<HTMLElement>(".q-context-menu .q-context-menu-item .q-context-menu-item__text");
                    for (const item of items) {
                        if (item.innerText == "转发") showForwardBtn = false;
                        if (item.innerText == "撤回") showForceRevokeBtn = false;
                    }
                    const pluginMenuElement = document.createElement("div");
                    const pluginMenuRoot = createRoot(pluginMenuElement);
                    pluginMenuRoot.render(
                        <Menu
                            msg={msg}
                            showForwardBtn={showForwardBtn}
                            showForceRevokeBtn={showForceRevokeBtn}
                            showPlusOneBtn={true}
                            blur={() => {
                                menu.blur();
                                const mouseEvent = new MouseEvent("click", {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                });
                                document.querySelector<HTMLElement>("#app")?.dispatchEvent(mouseEvent);
                            }}
                        />,
                    );
                    menu.appendChild(pluginMenuElement);
                    requestAnimationFrame(() => {
                        const rect = menu.getBoundingClientRect();
                        if (rect.bottom + 20 > document.body.clientHeight) {
                            menu.style.top = "";
                            menu.style.bottom = "20px";
                        }
                        if (rect.right + 20 > document.body.clientWidth) {
                            menu.style.left = "";
                            menu.style.right = "20px";
                        }
                    });
                });
            }
        };
        window.addEventListener("contextmenu", handler);
        // 由于图片比较特殊，会阻止右键消息传达到 window，所以需要单独设置 listener
        new MutationObserver(() => {
            const elements = document.querySelectorAll<HTMLElement>(".image-content:not(.enhanced-messaging-img-patched)");
            for (const element of elements) {
                element.classList.add("enhanced-messaging-img-patched");
                element.addEventListener("contextmenu", handler);
            }
        }).observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    }
}
