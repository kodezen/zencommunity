import React from 'react';
import PostForm from './PostForm';

// Same fields as the regular Post form, flagged anonymous — see PostForm's
// `anonymous` prop for the meta.is_anonymous + background-color handling.
const AnonymousPostForm = ({ spaceOptions, onDone }) => <PostForm spaceOptions={spaceOptions} onDone={onDone} anonymous />;

export default AnonymousPostForm;
