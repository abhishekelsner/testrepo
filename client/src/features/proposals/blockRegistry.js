/**
 * Shared block type → component map for editor and public view.
 */
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import VideoBlock from './blocks/VideoBlock';
import PricingTableBlock from './blocks/PricingTableBlock';
import ButtonBlock from './blocks/ButtonBlock';
import DividerBlock from './blocks/DividerBlock';
import ColumnsBlock from './blocks/ColumnsBlock';
import HtmlBlock from './blocks/HtmlBlock';
import FormBlock from './blocks/FormBlock';
import CalendarBlock from './blocks/CalendarBlock';
import RoiCalculatorBlock from './blocks/RoiCalculatorBlock';
import AgreementBlock from './blocks/AgreementBlock';

export const BLOCK_COMPONENTS = {
  text: TextBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  video: VideoBlock,
  pricing: PricingTableBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  columns: ColumnsBlock,
  html: HtmlBlock,
  form: FormBlock,
  calendar: CalendarBlock,
  roi: RoiCalculatorBlock,
  agreement: AgreementBlock,
};
