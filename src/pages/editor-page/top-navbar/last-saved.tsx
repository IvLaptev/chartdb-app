import React, { useCallback } from 'react';
// import TimeAgo from 'timeago-react';
import TimeAgo from 'react-timeago';
import type { L10nsStrings } from 'react-timeago/lib/formatters/buildFormatter';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';
import { useChartDB } from '@/hooks/use-chartdb';
import { Badge } from '@/components/badge/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/tooltip/tooltip';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { useSecurity } from '@/hooks/use-security';
import type { Formatter } from 'node_modules/react-timeago/es6/types';
import { useQuery } from 'react-query';
import ru from 'react-timeago/lib/language-strings/ru';

export interface LastSavedProps {}

const timeAgolocaleFromLanguage = async (
    language: string
): Promise<{ formatter: Formatter; lang: string }> => {
    let locale: L10nsStrings;
    let lang: string;
    switch (language) {
        case 'es':
            locale = (await import('react-timeago/lib/language-strings/es'))
                .default;
            lang = 'es';
            break;
        case 'fr':
            locale = (await import('react-timeago/lib/language-strings/fr'))
                .default;
            lang = 'fr';
            break;
        case 'de':
            locale = (await import('react-timeago/lib/language-strings/de'))
                .default;
            lang = 'de';
            break;
        case 'hi':
            locale = (await import('react-timeago/lib/language-strings/hi'))
                .default;
            lang = 'hi_IN';
            break;
        case 'ja':
            locale = (await import('react-timeago/lib/language-strings/ja'))
                .default;
            lang = 'ja';
            break;
        case 'ko_KR':
            locale = (await import('react-timeago/lib/language-strings/ko'))
                .default;
            lang = 'ko';
            break;
        case 'ru':
            locale = ru;
            lang = 'ru';
            break;
        case 'zh_CN':
            locale = (await import('react-timeago/lib/language-strings/zh-CN'))
                .default;
            lang = 'zh_CN';
            break;
        case 'zh_TW':
            locale = (await import('react-timeago/lib/language-strings/zh-TW'))
                .default;
            lang = 'zh_TW';
            break;
        case 'pt_BR':
            locale = (await import('react-timeago/lib/language-strings/pt-br'))
                .default;
            lang = 'pt_BR';
            break;
        default:
            locale = (await import('react-timeago/lib/language-strings/en'))
                .default;
            lang = 'en_US';
            break;
    }
    const formatter = buildFormatter(locale);
    return { formatter, lang };
};

export const LastSaved: React.FC<LastSavedProps> = () => {
    const { currentDiagram } = useChartDB();
    const { i18n } = useTranslation();
    // const [language, setLanguage] = useState<string>('en_US');

    const security = useSecurity();

    const { data: formatter } = useQuery([i18n.language], async () => {
        const { formatter } = await timeAgolocaleFromLanguage(i18n.language);

        // setLanguage(lang);
        return formatter;
    });

    const updatedAt = useCallback(() => {
        if (security.getUserType() === 'GUEST') {
            return currentDiagram.updatedAt;
        }
        return currentDiagram.savedAt || currentDiagram.updatedAt;
    }, [currentDiagram.updatedAt, currentDiagram.savedAt, security]);

    return (
        <Tooltip>
            <TooltipTrigger>
                <Badge
                    variant="secondary"
                    className="flex gap-1.5 whitespace-nowrap"
                >
                    <Save size={16} />
                    <TimeAgo date={updatedAt()} formatter={formatter} />
                </Badge>
            </TooltipTrigger>
            <TooltipContent>{updatedAt().toLocaleString()}</TooltipContent>
        </Tooltip>
    );
};
