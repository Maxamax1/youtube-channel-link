// ==UserScript==
// @name         Open Channel from Sidebar
// @namespace    http://tampermonkey.net
// @version      1.1.0
// @description  Opens the channel page, when clicking on the creator in the sidebar
// @author       Maxamax
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateurl    https://github.com/Maxamax1/youtube-channel-link/raw/main/open-channel-in-sidebar.user.js
// @downloadURL  https://github.com/Maxamax1/youtube-channel-link/raw/main/open-channel-in-sidebar.user.js
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    
    if (!(window.location.hostname === "www.youtube.com")) {
        return;
    }

    'use strict';

    var OVERLAY_CLASS = 'ocs-channel-link-overlay';

    var hoverStyle = document.createElement('style');
    hoverStyle.textContent =
        '.ytContentMetadataViewModelMetadataRow.ocs-channel-row:hover .ocs-channel-name {' +
        'text-decoration:underline!important;cursor:pointer!important;' +
        'color:var(--yt-spec-text-primary,#3ea6ff)!important;' +
        '}';
    document.documentElement.appendChild(hoverStyle);

    /** Invisible link over the first metadata row so the browser status bar shows the channel URL. */
    function ensureChannelOverlay(row, channelURL) {
        if (!row || !channelURL) return null;
        row.style.position = 'relative';
        var a = row.querySelector('a.' + OVERLAY_CLASS);
        if (!a) {
            a = document.createElement('a');
            a.className = OVERLAY_CLASS;
            a.setAttribute('aria-label', 'Open channel');
            a.style.cssText =
                'position:absolute;inset:0;z-index:3;opacity:0;cursor:pointer;' +
                'pointer-events:none;';
            row.appendChild(a);
        }
        a.href = channelURL;
        a.style.pointerEvents = 'auto';
        return a;
    }

    /** First row under yt-content-metadata-view-model (light DOM or shadow). */
    function getFirstContentMetadataRow(meta) {
        if (!meta) return null;
        var row = meta.querySelector('.ytContentMetadataViewModelMetadataRow');
        if (row) return row;
        if (meta.shadowRoot) {
            return meta.shadowRoot.querySelector('.ytContentMetadataViewModelMetadataRow');
        }
        return null;
    }

    /**
     * New sidebar lockup: channel name is the span in the first .ytContentMetadataViewModelMetadataRow
     * (second row = views • date; those spans share the same classes — only first row counts).
     */
    function isSidebarChannelNameTarget(el) {
        if (!el) return false;
        if (el.tagName === 'YT-FORMATTED-STRING' && el.classList.contains('ytd-channel-name')) {
            return true;
        }
        if (el.tagName !== 'SPAN') return false;
        if (!el.closest('yt-lockup-view-model')) return false;

        var row = el.closest('.ytContentMetadataViewModelMetadataRow');
        if (!row) return false;

        var meta = el.closest('yt-content-metadata-view-model');
        if (!meta) return false;

        var firstRow = getFirstContentMetadataRow(meta);
        return !!(firstRow && firstRow === row && row.contains(el));
    }

    /**
     * After the invisible link overlay is on top, mouseover targets the overlay, not the span.
     * Resolve the same channel row + span for both cases.
     */
    function resolveChannelHoverTarget(target) {
        if (!target) return null;
        if (target.classList && target.classList.contains(OVERLAY_CLASS)) {
            var row = target.closest('.ytContentMetadataViewModelMetadataRow');
            if (!row) return null;
            var span = row.querySelector('span');
            if (!span || !isSidebarChannelNameTarget(span)) return null;
            return { row: row, channelSpan: span };
        }
        if (isSidebarChannelNameTarget(target)) {
            return {
                row: target.closest('.ytContentMetadataViewModelMetadataRow'),
                channelSpan: target
            };
        }
        return null;
    }

    /** Watch URL: thumbnail or title link on the lockup (channel text has no wrapping anchor). */
    function getSidebarVideoAnchor(el) {
        var direct = el.closest('a');
        if (direct && (/[?&]v=/.test(direct.href) || /\/shorts\//.test(direct.href))) return direct;

        var lockup = el.closest('yt-lockup-view-model');
        if (!lockup) return direct || null;

        var link =
            lockup.querySelector('a.yt-lockup-view-model__content-image[href*="watch"]') ||
            lockup.querySelector('a.yt-lockup-metadata-view-model__title[href]') ||
            lockup.querySelector('a#video-title[href]') ||
            lockup.querySelector('a[href*="/watch?v="]') ||
            lockup.querySelector('a[href*="watch?v="]') ||
            lockup.querySelector('a[href*="/shorts/"]');
        return link || direct || null;
    }

    function videoIdFromHref(href) {
        if (!href) return null;
        var m = href.match(/[?&]v=([^&]+)/);
        if (m) return m[1];
        m = href.match(/\/shorts\/([^/?&#]+)/);
        if (m) return m[1];
        return null;
    }

    // get your api key here https://console.cloud.google.com/apis/api/youtube.googleapis.com/
    function getapikey() {
        const ITEM_KEY = 'YOUTUBE_API_KEY';
        const apiKey = window.localStorage.getItem(ITEM_KEY);
        if (apiKey) {
            return apiKey;
          } else {
            const key = prompt('Enter your youtube api key');
            window.localStorage.setItem(ITEM_KEY, key);
            return key;
          }
    }
    let apikey = getapikey();
    // Function to extract channel URL; optional onReady(url); channelSpan used for overlay + status bar
    function getChannelURL(videoElement, onReady, channelSpan) {
        var videoURL = videoElement.dataset.originalHref || videoElement.href;

        var videoID = videoIdFromHref(videoURL);
        if (!videoID) {
            console.error('open-channel-in-sidebar: could not parse video id from', videoURL);
            return;
        }

        var apiUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' + videoID + '&key=' + apikey + '&part=snippet';
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (!data.items || !data.items[0] || !data.items[0].snippet) {
                    console.error('open-channel-in-sidebar: no video in API response', data);
                    return;
                }
                var channelID = data.items[0].snippet.channelId;
                var channelURL = 'https://www.youtube.com/channel/' + channelID;

                console.log('Channel URL:', channelURL);
                videoElement.dataset.newHref = channelURL;
                var row = channelSpan && channelSpan.closest('.ytContentMetadataViewModelMetadataRow');
                if (row) ensureChannelOverlay(row, channelURL);
                if (onReady) onReady(channelURL);
            })
            .catch(error => {
                console.error('Error fetching video details:', error);
            });
    }

    document.addEventListener('mouseover', function (event) {
        var resolved = resolveChannelHoverTarget(event.target);
        if (!resolved) return;

        var channelSpan = resolved.channelSpan;
        var row = resolved.row;

        var anchorElement = getSidebarVideoAnchor(channelSpan);
        if (!anchorElement) return;

        if (!anchorElement.dataset.originalHref) {
            anchorElement.dataset.originalHref = anchorElement.href;
        }

        if (row) row.classList.add('ocs-channel-row');
        channelSpan.classList.add('ocs-channel-name');

        if (anchorElement.dataset.newHref) {
            if (row) ensureChannelOverlay(row, anchorElement.dataset.newHref);
        } else {
            getChannelURL(anchorElement, null, channelSpan);
        }
    });

    document.addEventListener('mouseout', function (event) {
        var target = event.target;
        var row;

        if (target.classList && target.classList.contains(OVERLAY_CLASS)) {
            row = target.closest('.ytContentMetadataViewModelMetadataRow');
            if (!row || row.contains(event.relatedTarget)) return;
            row.classList.remove('ocs-channel-row');
            var nameSpan = row.querySelector('span.ocs-channel-name');
            if (nameSpan) nameSpan.classList.remove('ocs-channel-name');
            return;
        }

        if (!isSidebarChannelNameTarget(target)) return;
        row = target.closest('.ytContentMetadataViewModelMetadataRow');
        if (row) {
            if (row.contains(event.relatedTarget)) return;
            row.classList.remove('ocs-channel-row');
        }
        target.classList.remove('ocs-channel-name');
    });
    function handleChannelNameClick(event) {
        var target = event.target;
        if (target.classList && target.classList.contains(OVERLAY_CLASS)) {
            return;
        }
        if (!isSidebarChannelNameTarget(target)) return;

        var anchorElement = getSidebarVideoAnchor(target);
        if (!anchorElement) return;

        if (!anchorElement.dataset.originalHref) {
            anchorElement.dataset.originalHref = anchorElement.href;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        if (anchorElement.dataset.newHref) {
            window.location.href = anchorElement.dataset.newHref;
        } else {
            getChannelURL(
                anchorElement,
                function (url) {
                    window.location.href = url;
                },
                target
            );
        }
    }

    document.addEventListener('click', handleChannelNameClick, true);
})();