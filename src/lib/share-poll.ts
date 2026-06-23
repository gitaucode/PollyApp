import * as Linking from 'expo-linking';
import { Share } from 'react-native';

export async function sharePoll(poll: { id: string; question: string }) {
  const url = Linking.createURL(`/results?pollId=${encodeURIComponent(poll.id)}`);
  await Share.share({
    title: poll.question,
    message: `Vote on PollyPop: "${poll.question}"\n${url}`,
  });
}
