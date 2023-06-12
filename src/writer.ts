import type { CheckpointWriter } from '@snapshot-labs/checkpoint';
import { Category, Discussion, Vote } from '../.checkpoint/models';
import { getJSON } from './utils';

// @ts-ignore
export const handleNewCategory: CheckpointWriter = async ({ payload, source }) => {
  console.log('Handle new category', payload);

  const [id, parent, metadataUri] = payload.events;
  // @ts-ignore
  const categoryId = `${source.contract}/${id}`;

  const category = new Category(categoryId);
  category.category_id = id;
  category.parent = parent;
  category.metadata_uri = metadataUri;

  try {
    const metadata: any = await getJSON(metadataUri);

    if (metadata.name) category.name = metadata.name;
    if (metadata.about) category.about = metadata.about;
  } catch (e) {
    console.log(e);
  }

  await category.save();
};

// @ts-ignore
export const handleNewDiscussion: CheckpointWriter = async ({ payload, source }) => {
  console.log('Handle new discussion', payload);

  const [discussionNum, author, categoryNum, parent, metadataUri] = payload.events;
  // @ts-ignore
  const discussionId = `${source.contract}/${discussionNum}`;
  // @ts-ignore
  const categoryId = `${source.contract}/${categoryNum}`;
  // @ts-ignore
  const parentId = `${source.contract}/${parent}`;

  const discussion = new Discussion(discussionId);
  discussion.discussion_id = discussionNum;
  discussion.category = categoryId;
  discussion.author = author;
  discussion.parent = parent;
  discussion.metadata_uri = metadataUri;

  try {
    const metadata: any = await getJSON(metadataUri);

    if (metadata.title) discussion.title = metadata.title;
    if (metadata.content) discussion.content = metadata.content;
  } catch (e) {
    console.log(e);
  }

  await discussion.save();

  if (parent !== 0) {
    const parentDiscussion = await Discussion.loadEntity(parentId);

    if (parentDiscussion) {
      parentDiscussion.reply_count += 1;

      await parentDiscussion.save();
    }
  } else {
    const category = await Category.loadEntity(categoryId);
    if (category) {
      category.discussion_count += 1;

      await category.save();
    }
  }
};

// @ts-ignore
export const handleNewVote: CheckpointWriter = async ({ payload, source }) => {
  console.log('Handle new vote', payload);

  const [voter, discussionNum, choice] = payload.events;
  // @ts-ignore
  const discussionId = `${source.contract}/${discussionNum}`;
  const voteId = `${voter}/${discussionId}`;
  let newVote = false;
  let previousVoteChoice;

  let vote = await Vote.loadEntity(voteId);
  if (!vote) {
    vote = new Vote(voteId);
    newVote = true;
  } else {
    previousVoteChoice = vote.choice;
  }
  vote.voter = voter;
  vote.discussion = discussionId;
  vote.choice = choice;

  await vote.save();

  const discussion = await Discussion.loadEntity(discussionId);

  if (discussion) {
    discussion.score += choice;
    if (newVote) {
      discussion.vote_count += 1;
    } else {
      discussion.score -= previousVoteChoice;
    }

    await discussion.save();
  }
};
