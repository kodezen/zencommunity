// Same extension list TruePlayer's own Media::is_audio_extension() uses
// (includes/media.php) — kept in step with it so a legacy item with no
// explicit config.source.mediaType (anything created before TruePlayer 1.4.0
// added audio as a first-class type) still classifies the same way here as
// it would there, instead of any picker inventing its own guess.
export const TRUEPLAYER_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg', 'oga', 'flac', 'opus', 'aac', 'weba'];

export const isAudioExtension = (url) => {
    if (!url || typeof url !== 'string') return false;
    const path = url.split(/[?#]/)[0];
    const ext = path.split('.').pop()?.toLowerCase();
    return !!ext && TRUEPLAYER_AUDIO_EXTENSIONS.includes(ext);
};

// Mirrors TruePlayer's own Media::is_audio() precedence: an explicit
// mediaType always wins; only falls back to sniffing the source URL/file
// name when the item predates that field existing at all.
export const trueplayerMediaType = (item) => {
    const source = item?.config?.source || {};
    if (source.mediaType === 'audio' || source.mediaType === 'video') return source.mediaType;
    return isAudioExtension(source.src) || isAudioExtension(source.fileName) ? 'audio' : 'video';
};
