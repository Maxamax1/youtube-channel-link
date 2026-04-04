// ==UserScript==
// @name         Open Channel from Sidebar
// @namespace    http://tampermonkey.net
// @version      1.0.6
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

    /** Sidebar “Up next”: channel row is span under yt-content-metadata-view-model (first row). */
    function isSidebarChannelNameTarget(el) {
        if (!el) return false;
        if (el.tagName === 'YT-FORMATTED-STRING' && el.classList.contains('ytd-channel-name')) {
            return true;
        }
        if (el.tagName !== 'SPAN') return false;
        const meta = el.closest('yt-content-metadata-view-model');
        if (!meta) return false;
        const firstRow = meta.querySelector(':scope > div');
        return !!(firstRow && firstRow.contains(el));
    }

    /** Video watch URL lives on the lockup anchor; channel name span may sit outside that a. */
    function getSidebarVideoAnchor(el) {
        const direct = el.closest('a');
        if (direct && /[?&]v=/.test(direct.href)) return direct;
        const lockup = el.closest('yt-lockup-view-model');
        if (lockup) {
            const link = lockup.querySelector('a[href*="watch?v="]');
            if (link) return link;
        }
        return direct || null;
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
    // Function to extract and display channel URL
    function getChannelURL(videoElement) {


        // Get the video URL
        var videoURL = videoElement.dataset.originalHref;

        // Parse the video URL to get the video ID
        var videoID = videoURL.match(/[?&]v=([^&]+)/)[1];

        // Use the YouTube Data API to fetch video details, including channel ID
        var apiUrl = 'https://www.googleapis.com/youtube/v3/videos?id=' + videoID + '&key=' + apikey + '&part=snippet';
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                var channelID = data.items[0].snippet.channelId;

                // Construct the channel URL
                var channelURL = 'https://www.youtube.com/channel/' + channelID;

                // Display the channel URL in the console
                console.log('Channel URL:', channelURL);
                // Replace the href with your custom link
                videoElement.href = channelURL; // Replace with your desired URL
                videoElement.dataset.newHref = channelURL;
            })
            .catch(error => {
                console.error('Error fetching video details:', error);
            });
    }

    // Listen for mouseover events on video elements
    document.addEventListener('mouseover', function (event) {
        var target = event.target;
        //console.log('Detected hover:', target.tagName + " " + target.id);
        if (isSidebarChannelNameTarget(target)) {
            var anchorElement = getSidebarVideoAnchor(target);
            if (!anchorElement) return;
            if (!(anchorElement.dataset.originalHref)) {
                // Save the original href
                anchorElement.dataset.originalHref = anchorElement.href;

            }
            target.onclick = null;
            anchorElement.click = null;
            target.onclick = function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var anchorElement1 = getSidebarVideoAnchor(ev.target);
                if (anchorElement1) window.location.href = anchorElement1.href;
            }
            if (!(anchorElement.dataset.newHref)) {
                getChannelURL(anchorElement);
            } else {
                anchorElement.href = anchorElement.dataset.newHref;
            }
            //console.log('channel name is: ' + target.textContent + ' ' + anchorElement.href);
            // When hovering over a video link, get and display the channel URL

        }
    });

    // Listen for mouseout events on the document
    document.addEventListener('mouseout', function (event) {
        var target = event.target;

        if (isSidebarChannelNameTarget(target)) {
            var anchorElement = getSidebarVideoAnchor(target);

            if (anchorElement && anchorElement.dataset.originalHref) {
                anchorElement.href = anchorElement.dataset.originalHref;

                // Remove the dataset.originalHref attribute
                //delete anchorElement.dataset.originalHref;
            }
        }
    });
    // Handle click events on the document
    document.addEventListener('click', function (event) {
        var target = event.target;

        if (isSidebarChannelNameTarget(target)) {
            var anchorElement = getSidebarVideoAnchor(target);

            // Check if an "a" element is found and has a dataset.originalHref attribute
            if (anchorElement && anchorElement.dataset.originalHref) {
                // Prevent the default behavior (e.g., following the original link)
                event.preventDefault();
                event.stopPropagation();
                console.log('test');
                // Navigate to your custom URL
                window.location.href = anchorElement.href;
            }
        }
    });
})();